#!/usr/bin/env node
/**
 * Phase 2 — Real Business Review session trace (Production, authenticated).
 * BLOCKED without QA_AUTH_STORAGE_STATE_PATH or apps/web/.qa-auth/storageState.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storageDefault = path.join(webRoot, '.qa-auth/storageState.json');
const storagePath = process.env.QA_AUTH_STORAGE_STATE_PATH || storageDefault;

const outDir = path.resolve(
  webRoot,
  '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/PRODUCTION',
);
const outFile = path.join(outDir, 'real-business-review-trace.json');

const blocked = {
  status: 'BLOCKED',
  sessionId: null,
  productionUrl: 'https://ai-startup-validation-tau.vercel.app',
  gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  startedAt: null,
  finishedAt: new Date().toISOString(),
  turns: [],
  finalKnowledgeState: null,
  reasoning: null,
  judgment: null,
  uncertainty: null,
  nextValidation: null,
  blockReason:
    'Missing QA_AUTH_STORAGE_STATE_PATH or apps/web/.qa-auth/storageState.json — Real Business Review trace requires authenticated Production session.',
  nextStep: 'Provide storageState → implement browser capture → re-run this script',
};

if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(blocked, null, 2)}\n`, 'utf8');
  console.log(`BLOCKED — wrote ${outFile}`);
  process.exit(0);
}

console.log('Auth state present — browser capture not yet wired in this script.');
blocked.status = 'BLOCKED';
blocked.blockReason = 'storageState present but automated trace capture TODO (Phase 2 engineering)';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(blocked, null, 2)}\n`, 'utf8');
process.exit(0);
