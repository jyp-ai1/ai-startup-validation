import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  AiProductContent,
  ExtractedProduct,
  OptimizedImages,
  ProductDraft,
  SaveDraftInput,
} from '../types';

const DRAFTS_DIR = path.join(process.cwd(), '.naver-commerce', 'drafts');

export async function ensureDraftsDir(): Promise<string> {
  await mkdir(DRAFTS_DIR, { recursive: true });
  return DRAFTS_DIR;
}

/** Build Naver-compatible product draft JSON. */
export function createProductDraft(params: {
  traceId: string;
  product: ExtractedProduct;
  aiContent: AiProductContent;
  images: OptimizedImages;
  aiGenerated?: boolean;
}): ProductDraft {
  const now = new Date().toISOString();
  const id = `DRAFT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  return {
    id,
    version: '1.0',
    status: 'draft',
    sourceUrl: params.product.sourceUrl,
    createdAt: now,
    updatedAt: now,
    product: {
      title: params.aiContent.title,
      summary: params.aiContent.summary,
      description: params.aiContent.description,
      price: params.product.price,
      currency: params.product.currency,
      brand: params.product.brand,
      category: params.product.category,
      seoKeywords: params.aiContent.seoKeywords,
      options: params.product.options,
      shipping: params.product.shipping,
    },
    images: {
      original: params.images.original,
      optimized: params.images.webp,
      thumbnail: params.images.thumbnail,
      zipPath: params.images.zipPath,
    },
    metadata: {
      traceId: params.traceId,
      aiGenerated: params.aiGenerated ?? true,
    },
  };
}

/** Persist draft JSON to disk. */
export async function saveDraft(draft: ProductDraft): Promise<string> {
  await ensureDraftsDir();
  const filePath = path.join(DRAFTS_DIR, `${draft.id}.json`);
  const updated = { ...draft, updatedAt: new Date().toISOString() };
  await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
  return filePath;
}

/** Load draft by ID. */
export async function loadDraft(draftId: string): Promise<ProductDraft | null> {
  const filePath = path.join(DRAFTS_DIR, `${draftId}.json`);
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as ProductDraft;
  } catch {
    return null;
  }
}

/** Apply manual edits and re-save draft. */
export async function updateDraft(input: SaveDraftInput): Promise<ProductDraft> {
  const { draft, edits } = input;
  const updated: ProductDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
    product: edits ? { ...draft.product, ...edits } : draft.product,
  };
  await saveDraft(updated);
  return updated;
}

/** Simulate Naver draft upload — saves locally for MVP. */
export async function uploadDraftToNaver(draft: ProductDraft): Promise<{
  productId: string;
  status: 'draft';
  url: string;
  savedPath: string;
}> {
  const savedPath = await saveDraft({ ...draft, status: 'draft' });
  const productId = `NAVER-${draft.id.replace('DRAFT-', '')}`;

  return {
    productId,
    status: 'draft',
    url: `https://smartstore.naver.com/products/${productId}`,
    savedPath,
  };
}
