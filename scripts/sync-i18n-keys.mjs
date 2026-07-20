import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../packages/i18n/src/messages');
const source = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));
const locales = ['ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'pt', 'vi', 'id'];

function deepMerge(target, sourceObj) {
  for (const key of Object.keys(sourceObj)) {
    if (
      sourceObj[key] &&
      typeof sourceObj[key] === 'object' &&
      !Array.isArray(sourceObj[key])
    ) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], sourceObj[key]);
    } else if (!(key in target)) {
      target[key] = sourceObj[key];
    }
  }
  return target;
}

for (const locale of locales) {
  const file = path.join(dir, `${locale}.json`);
  const target = JSON.parse(fs.readFileSync(file, 'utf8'));
  deepMerge(target, source);
  fs.writeFileSync(file, `${JSON.stringify(target, null, 2)}\n`);
  console.log(`Synced ${locale}`);
}
