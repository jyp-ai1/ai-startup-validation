import fs from 'node:fs';
import path from 'node:path';

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

const messagesDir = path.join('packages', 'i18n', 'src', 'messages');
const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));
const ko = JSON.parse(fs.readFileSync(path.join(messagesDir, 'ko.json'), 'utf8'));

const enKeys = flattenKeys(en);
const missingInKo = enKeys.filter((key) => typeof get(ko, key) !== 'string');
const emptyInKo = enKeys.filter((key) => get(ko, key) === '');

console.log(JSON.stringify({ total: enKeys.length, missingInKo: missingInKo.length, emptyInKo: emptyInKo.length, sample: missingInKo.slice(0, 20) }, null, 2));
