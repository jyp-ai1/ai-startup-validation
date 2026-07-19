import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import archiver from 'archiver';
import sharp from 'sharp';

export type ImageServiceOptions = {
  outputDir?: string;
};

/** MVP image processing — Sharp only, no separate platform package. */
export class ImageService {
  private readonly outputDir: string;

  constructor(options: ImageServiceOptions = {}) {
    this.outputDir = options.outputDir ?? path.join(process.cwd(), '.naver-commerce', 'images');
  }

  async ensureDir(): Promise<string> {
    await mkdir(this.outputDir, { recursive: true });
    return this.outputDir;
  }

  /** Copy or fetch image to working directory. */
  async download(sourcePath: string, filename?: string): Promise<string> {
    await this.ensureDir();
    const base = filename ?? path.basename(sourcePath);
    const dest = path.join(this.outputDir, base);

    if (sourcePath.startsWith('http://') || sourcePath.startsWith('https://')) {
      const res = await fetch(sourcePath);
      if (!res.ok) throw new Error(`Failed to download image: ${sourcePath}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buffer);
      return dest;
    }

    await copyFile(sourcePath, dest);
    return dest;
  }

  /** Resize image to max dimension while preserving aspect ratio. */
  async resize(inputPath: string, maxSize = 1200): Promise<string> {
    await this.ensureDir();
    const ext = path.extname(inputPath);
    const base = path.basename(inputPath, ext);
    const out = path.join(this.outputDir, `${base}-${maxSize}${ext || '.png'}`);

    await sharp(inputPath)
      .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
      .toFile(out);

    return out;
  }

  /** Convert image to WebP format. */
  async webp(inputPath: string, quality = 85): Promise<string> {
    await this.ensureDir();
    const base = path.basename(inputPath, path.extname(inputPath));
    const out = path.join(this.outputDir, `${base}.webp`);

    await sharp(inputPath).webp({ quality }).toFile(out);
    return out;
  }

  /** Strip EXIF and metadata from image. */
  async removeMetadata(inputPath: string): Promise<string> {
    await this.ensureDir();
    const ext = path.extname(inputPath) || '.png';
    const base = path.basename(inputPath, ext);
    const out = path.join(this.outputDir, `${base}-clean${ext}`);

    await sharp(inputPath).rotate().toFile(out);
    return out;
  }

  /** Create thumbnail (200px). */
  async thumbnail(inputPath: string): Promise<string> {
    await this.ensureDir();
    const base = path.basename(inputPath, path.extname(inputPath));
    const out = path.join(this.outputDir, `${base}-thumb.webp`);
    await sharp(inputPath).resize(200, 200, { fit: 'cover' }).webp({ quality: 80 }).toFile(out);
    return out;
  }

  /** Process all images: download → resize → webp → remove metadata. */
  async processAll(sourcePaths: string[]): Promise<{
    original: string[];
    webp: string[];
    thumbnail: string;
  }> {
    const original: string[] = [];
    const webp: string[] = [];

    for (const src of sourcePaths) {
      const local = await this.download(src);
      const cleaned = await this.removeMetadata(local);
      const resized = await this.resize(cleaned);
      const webpPath = await this.webp(resized);
      original.push(resized);
      webp.push(webpPath);
    }

    const thumbnail = original.length > 0 ? await this.thumbnail(original[0]!) : '';

    return { original, webp, thumbnail };
  }

  /** Zip processed images for upload bundle. */
  async zip(filePaths: string[], zipName = 'product-images.zip'): Promise<string> {
    await this.ensureDir();
    const zipPath = path.join(this.outputDir, zipName);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', reject);

      archive.pipe(output);
      for (const file of filePaths) {
        archive.file(file, { name: path.basename(file) });
      }
      void archive.finalize();
    });

    return zipPath;
  }

  /** SHA-256 hash for duplicate detection. */
  async hash(filePath: string): Promise<string> {
    const data = await readFile(filePath);
    return createHash('sha256').update(data).digest('hex');
  }
}

let defaultService: ImageService | null = null;

export function getImageService(options?: ImageServiceOptions): ImageService {
  if (!defaultService) {
    defaultService = new ImageService(options);
  }
  return defaultService;
}
