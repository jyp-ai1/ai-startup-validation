#!/usr/bin/env node
/**
 * Sprint L2.4.1 — Translation coverage audit
 * Usage: node scripts/audit-i18n-coverage.mjs [--strict]
 *
 * Reports KO/EN key parity, hardcoded UI strings in critical surfaces, and beta locale policy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const strict = process.argv.includes('--strict');

const messagesDir = path.join(root, 'packages', 'i18n', 'src', 'messages');
const scanDirs = [
  path.join(root, 'apps', 'web', 'features', 'landing'),
  path.join(root, 'apps', 'web', 'components'),
  path.join(root, 'apps', 'web', 'app', 'auth'),
];

const IGNORE_FILE = /\.(test|spec)\.(ts|tsx)$/;
const KOREAN_IN_STRING = /['"`][^'"`]*[가-힣]{2,}[^'"`]*['"`]/;
const JSX_KOREAN = />[^<{]*[가-힣]{2,}[^<{]*</;

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

function get(obj, dotPath) {
  return dotPath.split('.').reduce((cur, part) => (cur && typeof cur === 'object' ? cur[part] : undefined), obj);
}

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walkFiles(full, acc);
    } else if (/\.(tsx|ts)$/.test(entry.name) && !IGNORE_FILE.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function scanHardcoded(files) {
  const hits = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('useTranslations') || line.trim().startsWith('//')) continue;
      if (KOREAN_IN_STRING.test(line) || JSX_KOREAN.test(line)) {
        hits.push({ file: path.relative(root, file), line: i + 1, text: line.trim().slice(0, 120) });
      }
    }
  }
  return hits;
}

const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));
const ko = JSON.parse(fs.readFileSync(path.join(messagesDir, 'ko.json'), 'utf8'));

const enKeys = flattenKeys(en);
const koKeys = new Set(flattenKeys(ko));
const missingInKo = enKeys.filter((key) => typeof get(ko, key) !== 'string');
const missingInEn = [...koKeys].filter((key) => typeof get(en, key) !== 'string');
const emptyInKo = enKeys.filter((key) => get(ko, key) === '');

const files = scanDirs.flatMap((dir) => walkFiles(dir));
const hardcoded = scanHardcoded(files);

const koCoverage = Math.round(((enKeys.length - missingInKo.length) / enKeys.length) * 10000) / 100;
const enCoverage = Math.round(((koKeys.size - missingInEn.length) / koKeys.size) * 10000) / 100;

const report = {
  summary: {
    koCoverage: `${koCoverage}%`,
    enCoverage: `${enCoverage}%`,
    enKeys: enKeys.length,
    koKeys: koKeys.size,
    missingInKo: missingInKo.length,
    missingInEn: missingInEn.length,
    emptyInKo: emptyInKo.length,
    hardcodedInCriticalSurfaces: hardcoded.length,
    betaLocales: ['ko', 'en', 'ja', 'zh-CN'],
  },
  missingInKoSample: missingInKo.slice(0, 15),
  missingInEnSample: missingInEn.slice(0, 15),
  hardcodedSample: hardcoded.slice(0, 20),
};

console.log('\n=== Translation Coverage Audit (Sprint L2.4.1) ===\n');
console.log(`KO coverage: ${report.summary.koCoverage} (${missingInKo.length} missing)`);
console.log(`EN coverage: ${report.summary.enCoverage} (${missingInEn.length} missing)`);
console.log(`Hardcoded (landing/components/auth): ${hardcoded.length}`);
console.log(`Beta locales in switcher: ${report.summary.betaLocales.join(', ')}`);

if (missingInKo.length > 0) {
  console.log('\nMissing in KO (sample):');
  for (const key of report.missingInKoSample) console.log(`  - ${key}`);
}

if (hardcoded.length > 0) {
  console.log('\nHardcoded strings (sample):');
  for (const hit of report.hardcodedSample) {
    console.log(`  - ${hit.file}:${hit.line}  ${hit.text}`);
  }
}

const pass =
  missingInKo.length === 0 &&
  missingInEn.length === 0 &&
  hardcoded.length === 0;

console.log(`\nTranslation PASS: ${pass ? 'YES' : 'NO'}`);

if (strict && !pass) {
  process.exit(1);
}

process.exit(0);
