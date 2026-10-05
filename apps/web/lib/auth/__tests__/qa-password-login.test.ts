import { describe, expect, it } from 'vitest';

import {
  qaLoginGrantsAdminRole,
  resolveQaLoginEmail,
} from '../qa-password-login';

describe('QA password login ids', () => {
  it('maps allowlisted ids to qa emails', () => {
    expect(resolveQaLoginEmail('user1')).toBe('user1@alabom-qa.invalid');
    expect(resolveQaLoginEmail('ADMIN')).toBe('admin@alabom-qa.invalid');
    expect(resolveQaLoginEmail('user5')).toBe('user5@alabom-qa.invalid');
  });

  it('rejects unknown or malformed ids', () => {
    expect(resolveQaLoginEmail('user6')).toBeNull();
    expect(resolveQaLoginEmail('detourdada@gmail.com')).toBeNull();
    expect(resolveQaLoginEmail('')).toBeNull();
    expect(resolveQaLoginEmail('user 1')).toBeNull();
  });

  it('never grants admin RBAC from the admin login id', () => {
    expect(qaLoginGrantsAdminRole('admin')).toBe(false);
    expect(qaLoginGrantsAdminRole('user1')).toBe(false);
  });

  it('does not embed passwords in the login id map', async () => {
    const source = await import('../qa-login-ids.json');
    const serialized = JSON.stringify(source);
    expect(serialized).not.toMatch(/1234|0070|password/i);
  });
});
