import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('packages', 'i18n', 'src', 'messages');
const master = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));
const locales = fs
  .readdirSync(dir)
  .filter((file) => file.endsWith('.json') && file !== 'en.json' && file !== 'ko.json');

function mergeMissing(target, source) {
  for (const key of Object.keys(source)) {
    if (!(key in target)) {
      target[key] = source[key];
    } else if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      mergeMissing(target[key], source[key]);
    }
  }
}

for (const file of locales) {
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  mergeMissing(data, master);

  if (data.meta) {
    data.meta.appTagline = 'AI Strategy Consultant';
    data.meta.appDescription = master.meta.appDescription;
  }
  if (data.intelligence) {
    data.intelligence.platformTitle = master.intelligence.platformTitle;
    data.intelligence.platformSubtitle = master.intelligence.platformSubtitle;
  }
  if (data.landing) {
    data.landing.footerFramework = master.landing.footerFramework;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`patched ${file}`);
}
