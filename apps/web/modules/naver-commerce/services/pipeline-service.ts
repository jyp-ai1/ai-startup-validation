import { generateProductContent } from './ai-content-service';
import { createProductDraft, saveDraft, uploadDraftToNaver } from './draft-service';
import { getImageService } from './image-service';
import { extractProductFromHtml } from './product-extractor';
import type {
  ImportProductInput,
  PipelineLogEntry,
  PipelineRunResult,
  PipelineStepId,
  PipelineStepState,
} from '../types';
import { resolveCrawlUrl } from '../utils/url-validator';

const STEP_LABELS: Record<PipelineStepId, string> = {
  validate: 'URL 검증',
  crawl: '브라우저 크롤링',
  extract: '상품 정보 추출',
  'optimize-images': '이미지 최적화',
  'generate-ai': 'AI 설명 생성',
  'save-draft': '초안 저장',
};

function createSteps(): PipelineStepState[] {
  return (Object.keys(STEP_LABELS) as PipelineStepId[]).map((id) => ({
    id,
    label: STEP_LABELS[id],
    status: 'pending',
  }));
}

function log(
  logs: PipelineLogEntry[],
  step: PipelineStepId,
  message: string,
  level: PipelineLogEntry['level'] = 'info',
): void {
  logs.push({ timestamp: new Date().toISOString(), level, step, message });
}

function setStep(
  steps: PipelineStepState[],
  id: PipelineStepId,
  status: PipelineStepState['status'],
  message?: string,
): void {
  const step = steps.find((s) => s.id === id);
  if (!step) return;
  step.status = status;
  if (message) step.message = message;
  if (status === 'running') step.startedAt = new Date().toISOString();
  if (status === 'completed' || status === 'failed') {
    step.completedAt = new Date().toISOString();
  }
}

/** Run full Naver Commerce import pipeline. */
export async function runProductPipeline(input: ImportProductInput): Promise<PipelineRunResult> {
  const traceId = input.traceId ?? crypto.randomUUID();
  const steps = createSteps();
  const logs: PipelineLogEntry[] = [];

  try {
    // 1. Validate URL
    setStep(steps, 'validate', 'running');
    log(logs, 'validate', `입력 URL: ${input.url || '(local test fixture)'}`);
    const crawlUrl = resolveCrawlUrl(input.url);
    setStep(steps, 'validate', 'completed', crawlUrl);
    log(logs, 'validate', `검증 완료: ${crawlUrl}`);

    // 2. Browser crawl via @repo/browser
    setStep(steps, 'crawl', 'running');
    log(logs, 'crawl', 'Playwright Chromium 실행 중...');
    const { getAutomationPlatform } = await import('@repo/automation');
    const automation = getAutomationPlatform();
    const crawlJob = await automation.runner.run(
      'browser.crawl',
      { urls: [crawlUrl], includeHtml: true },
      { traceId },
    );
    if (crawlJob.status !== 'completed' || !crawlJob.output) {
      throw new Error(crawlJob.error ?? 'Browser crawl failed');
    }
    const crawlOutput = crawlJob.output as {
      results: Array<{
        url: string;
        title: string;
        html?: string;
        htmlLength: number;
        screenshotPath?: string;
        downloads: string[];
        loadTimeMs: number;
      }>;
    };
    const page = crawlOutput.results[0];
    if (!page?.html) throw new Error('크롤링 결과가 없습니다.');
    setStep(steps, 'crawl', 'completed', `${page.title} (${page.loadTimeMs}ms)`);
    log(logs, 'crawl', `크롤링 완료: ${page.title}, HTML ${page.htmlLength} bytes`);

    // 3. Extract product data
    setStep(steps, 'extract', 'running');
    const extracted = extractProductFromHtml(page.html, crawlUrl, {
      screenshotPath: page.screenshotPath,
      downloads: page.downloads,
      loadTimeMs: page.loadTimeMs,
    });
    setStep(
      steps,
      'extract',
      'completed',
      `${extracted.title} · ${extracted.images.length} images · ${extracted.options.length} options`,
    );
    log(logs, 'extract', `추출: ${extracted.title}, 가격 ${extracted.price}${extracted.currency}`);

    // 4. Optimize images (Sharp — module-local, not platform)
    setStep(steps, 'optimize-images', 'running');
    const imageService = getImageService();
    const imageSources =
      page.downloads.length > 0 ? page.downloads : extracted.images.filter((i) => !i.startsWith('http'));
    let optimizedImages = { original: [] as string[], webp: [] as string[], thumbnail: '', zipPath: undefined as string | undefined };

    if (imageSources.length > 0) {
      const processed = await imageService.processAll(imageSources);
      const zipPath = await imageService.zip([...processed.webp], 'product-images.zip');
      optimizedImages = { ...processed, zipPath };
      setStep(steps, 'optimize-images', 'completed', `${processed.webp.length} WebP 생성`);
      log(logs, 'optimize-images', `이미지 ${processed.webp.length}장 WebP 변환 완료`);
    } else {
      setStep(steps, 'optimize-images', 'skipped', '이미지 없음');
      log(logs, 'optimize-images', '처리할 이미지 없음 — 건너뜀', 'warn');
    }

    // 5. AI content generation via @repo/ai
    setStep(steps, 'generate-ai', 'running');
    let aiContent;
    if (input.skipAi) {
      const { buildFallbackContent } = await import('./ai-content-service-internal');
      aiContent = buildFallbackContent(extracted);
      setStep(steps, 'generate-ai', 'skipped', 'AI 건너뜀 (fallback)');
      log(logs, 'generate-ai', 'Fallback 템플릿 사용');
    } else {
      aiContent = await generateProductContent(extracted, { fallback: true });
      setStep(steps, 'generate-ai', 'completed', aiContent.title.slice(0, 40));
      log(logs, 'generate-ai', `AI 생성: ${aiContent.title}`);
    }

    // 6. Save draft
    setStep(steps, 'save-draft', 'running');
    const draft = createProductDraft({
      traceId,
      product: extracted,
      aiContent,
      images: optimizedImages,
    });
    const savedPath = await saveDraft(draft);
    const upload = await uploadDraftToNaver(draft);
    setStep(steps, 'save-draft', 'completed', upload.productId);
    log(logs, 'save-draft', `초안 저장: ${savedPath}`);

    return {
      traceId,
      success: true,
      steps,
      extracted,
      aiContent,
      optimizedImages,
      draft: { ...draft, status: 'draft' },
      logs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedStep = steps.find((s) => s.status === 'running');
    if (failedStep) {
      setStep(steps, failedStep.id, 'failed', message);
      log(logs, failedStep.id, message, 'error');
    }
    return { traceId, success: false, steps, error: message, logs };
  }
}
