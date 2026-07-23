import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('packages', 'i18n', 'src', 'messages');
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.common) data.common = {};
  if (!data.common.navLinks) {
    data.common.navLinks = en.common.navLinks;
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`patched ${file}`);
  } else {
    console.log(`skip ${file}`);
  }
}
