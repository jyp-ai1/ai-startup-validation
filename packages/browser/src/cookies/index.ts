import type { BrowserContext } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

import { ensureDir } from '../utils/paths';
import { DownloadError } from '../errors';

export class CookieManager {
  constructor(private readonly storageDir: string) {
    ensureDir(storageDir);
  }

  private filePath(name: string): string {
    return path.join(this.storageDir, `${name}.cookies.json`);
  }

  async save(context: BrowserContext, name: string): Promise<string> {
    const state = await context.storageState();
    const filePath = this.filePath(name);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    return filePath;
  }

  async load(name: string): Promise<string | undefined> {
    const filePath = this.filePath(name);
    return fs.existsSync(filePath) ? filePath : undefined;
  }

  async clear(context: BrowserContext): Promise<void> {
    await context.clearCookies();
  }

  export(name: string): string | undefined {
    const filePath = this.filePath(name);
    return fs.existsSync(filePath) ? filePath : undefined;
  }

  import(name: string, sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) {
      throw new DownloadError(`Cookie file not found: ${sourcePath}`);
    }
    fs.copyFileSync(sourcePath, this.filePath(name));
  }
}
