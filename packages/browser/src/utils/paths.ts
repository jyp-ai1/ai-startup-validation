import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Path to bundled local test fixture — no external websites in tests. */
export function getTestFixturePath(filename = 'test-page.html'): string {
  const fixturePath = path.join(__dirname, '..', 'test-fixtures', filename);
  return pathToFileUrl(fixturePath);
}

export function pathToFileUrl(filePath: string): string {
  const resolved = path.resolve(filePath);
  return `file:///${resolved.replace(/\\/g, '/')}`;
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getTempDir(subdir: string): string {
  const dir = path.join(process.cwd(), '.browser-temp', subdir);
  ensureDir(dir);
  return dir;
}
