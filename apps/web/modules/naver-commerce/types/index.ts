/** Extracted product data from crawled page HTML. */
export type ExtractedProduct = {
  sourceUrl: string;
  title: string;
  price: number;
  currency: string;
  brand: string;
  category: string;
  description: string;
  images: string[];
  options: ProductOption[];
  shipping: ShippingInfo;
  rawHtmlLength: number;
  screenshotPath?: string;
};

export type ProductOption = {
  name: string;
  values: string[];
};

export type ShippingInfo = {
  method: string;
  fee: number;
  estimatedDays: string;
};

/** AI-generated marketing content. */
export type AiProductContent = {
  title: string;
  summary: string;
  description: string;
  seoKeywords: string[];
};

/** Optimized image paths after Sharp processing. */
export type OptimizedImages = {
  original: string[];
  webp: string[];
  thumbnail: string;
  zipPath?: string;
};

/** Naver Smart Store compatible draft (future upload). */
export type ProductDraft = {
  id: string;
  version: '1.0';
  status: 'draft' | 'ready' | 'uploaded';
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
  product: {
    title: string;
    summary: string;
    description: string;
    price: number;
    currency: string;
    brand: string;
    category: string;
    seoKeywords: string[];
    options: ProductOption[];
    shipping: ShippingInfo;
  };
  images: {
    original: string[];
    optimized: string[];
    thumbnail: string;
    zipPath?: string;
  };
  metadata: {
    traceId: string;
    crawlLoadTimeMs?: number;
    aiGenerated: boolean;
  };
};

export type PipelineStepId =
  | 'validate'
  | 'crawl'
  | 'extract'
  | 'optimize-images'
  | 'generate-ai'
  | 'save-draft';

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type PipelineStepState = {
  id: PipelineStepId;
  label: string;
  status: PipelineStepStatus;
  message?: string;
  startedAt?: string;
  completedAt?: string;
};

export type PipelineRunResult = {
  traceId: string;
  success: boolean;
  steps: PipelineStepState[];
  extracted?: ExtractedProduct;
  aiContent?: AiProductContent;
  optimizedImages?: OptimizedImages;
  draft?: ProductDraft;
  error?: string;
  logs: PipelineLogEntry[];
};

export type PipelineLogEntry = {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  step: PipelineStepId;
  message: string;
};

export type ImportProductInput = {
  url: string;
  traceId?: string;
  skipAi?: boolean;
};

export type SaveDraftInput = {
  draft: ProductDraft;
  edits?: Partial<ProductDraft['product']>;
};
