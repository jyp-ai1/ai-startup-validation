import type { Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { ensureDir } from '../utils/paths';
import { browserEvents } from '../events';

export class DownloadManager {
  private readonly seenHashes = new Set<string>();

  constructor(private readonly downloadDir: string) {
    ensureDir(downloadDir);
  }

  /** Download image by selector — saves to destination with duplicate detection. */
  async downloadImage(page: Page, selector: string, filename?: string): Promise<string | null> {
    const src = await page.locator(selector).getAttribute('src');
    if (!src) return null;

    if (src.startsWith('data:')) {
      return this.saveDataUri(src, filename);
    }

    // For file:// relative paths, resolve against page URL
    const resolved = new URL(src, page.url()).href;
    if (resolved.startsWith('file://')) {
      const localPath = fileUrlToPath(resolved);
      if (!fs.existsSync(localPath)) return null;
      return this.copyWithDedup(localPath, filename ?? path.basename(localPath));
    }

    return null;
  }

  private saveDataUri(dataUri: string, filename?: string): string {
    const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return '';
    const buffer = Buffer.from(match[1]!, 'base64');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (this.seenHashes.has(hash)) return '';
    this.seenHashes.add(hash);

    const filePath = path.join(this.downloadDir, filename ?? `${hash.slice(0, 12)}.bin`);
    fs.writeFileSync(filePath, buffer);
    browserEvents.emit({ type: 'download.completed', path: filePath });
    return filePath;
  }

  private copyWithDedup(sourcePath: string, filename: string): string {
    const buffer = fs.readFileSync(sourcePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (this.seenHashes.has(hash)) return '';
    this.seenHashes.add(hash);

    const ext = path.extname(filename) || path.extname(sourcePath);
    const filePath = path.join(this.downloadDir, `${hash.slice(0, 12)}${ext}`);
    fs.copyFileSync(sourcePath, filePath);
    browserEvents.emit({ type: 'download.completed', path: filePath });
    return filePath;
  }

  clearSeen(): void {
    this.seenHashes.clear();
  }
}

function fileUrlToPath(url: string): string {
  const parsed = new URL(url);
  let p = decodeURIComponent(parsed.pathname);
  if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1);
  return p;
}

export type { DownloadManager as DownloadManagerType };
