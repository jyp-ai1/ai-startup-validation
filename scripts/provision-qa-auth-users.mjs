#!/usr/bin/env node
/**
 * One-shot QA Auth user provision.
 * Reads passwords from process env only. Never print or write secrets.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   QA_AUTH_ADMIN_PASSWORD
 *   QA_AUTH_USER_PASSWORD
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loginIds = JSON.parse(
  readFileSync(resolve(process.cwd(), 'apps/web/lib/auth/qa-login-ids.json'), 'utf8'),
);

function env(name) {
  return (process.env[name] ?? '').trim();
}

const supabaseUrl = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const adminPassword = env('QA_AUTH_ADMIN_PASSWORD');
const userPassword = env('QA_AUTH_USER_PASSWORD');

if (!supabaseUrl || !serviceKey) {
  console.error('STOP: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}
if (!adminPassword || !userPassword) {
  console.error('STOP: QA_AUTH_ADMIN_PASSWORD / QA_AUTH_USER_PASSWORD must be provided at runtime');
  process.exit(1);
}

const existingRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=200`, {
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  },
});
const existingBody = await existingRes.json();
if (!existingRes.ok) {
  console.error('STOP: list users failed', existingRes.status);
  process.exit(1);
}
const existingByEmail = new Map(
  (existingBody.users ?? []).map((user) => [String(user.email ?? '').toLowerCase(), user]),
);

const results = [];
for (const [loginId, email] of Object.entries(loginIds)) {
  const password = loginId === 'admin' ? adminPassword : userPassword;
  const existing = existingByEmail.get(email.toLowerCase());
  if (existing) {
    const appRole = existing.app_metadata?.role ?? null;
    if (appRole) {
      results.push({ loginId, email, status: 'exists_with_role', role: appRole });
      continue;
    }
    const update = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata ?? {}),
          qa_login_id: loginId,
        },
      }),
    });
    const updateBody = await update.json();
    results.push({
      loginId,
      email,
      status: update.ok ? 'password_rotated' : 'update_failed',
      error: update.ok ? undefined : updateBody.error_code || updateBody.msg || updateBody.message,
    });
    continue;
  }

  const create = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        qa_login_id: loginId,
        full_name: loginId === 'admin' ? 'QA admin' : `QA ${loginId}`,
      },
    }),
  });
  const createBody = await create.json();
  const createdRole = createBody.app_metadata?.role ?? null;
  results.push({
    loginId,
    email,
    status: create.ok ? 'created' : 'create_failed',
    role: createdRole,
    error: create.ok ? undefined : createBody.error_code || createBody.msg || createBody.message,
  });
}

const failed = results.filter((row) => String(row.status).endsWith('failed') || row.role);
console.log(JSON.stringify({ results, failed: failed.length }, null, 2));
process.exit(failed.length ? 1 : 0);
