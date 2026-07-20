import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'apps/web');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.tsx')) continue;

    const content = fs.readFileSync(full, 'utf8');
    if (!content.includes('AI Startup Validation Framework')) continue;

    const updated = content.replaceAll('AI Startup Validation Framework', 'LaunchLens');
    fs.writeFileSync(full, updated);
    console.log('updated', path.relative(process.cwd(), full));
  }
}

walk(ROOT);
