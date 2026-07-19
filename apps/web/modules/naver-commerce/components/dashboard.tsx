'use client';

import { Button, LoadingSpinner, PageHeader } from '@repo/ui';

import { AiPreview } from '../components/ai-preview';
import { ImagePreview } from '../components/image-preview';
import { PipelineLogs } from '../components/pipeline-logs';
import { PipelineStatus } from '../components/pipeline-status';
import { ProductPreview } from '../components/product-preview';
import { UploadResult } from '../components/upload-result';
import { UrlInput } from '../components/url-input';
import { useProductPipeline } from '../hooks/use-product-pipeline';

export function NaverCommerceDashboard() {
  const {
    url,
    setUrl,
    loading,
    result,
    draft,
    error,
    importProduct,
    saveDraft,
    retry,
    updateDraftField,
  } = useProductPipeline();

  return (
    <>
      <PageHeader
        title="네이버 상품 자동등록"
        description="상품 URL을 입력하면 크롤링 → AI 설명 생성 → 이미지 최적화 → 초안 저장까지 자동으로 진행됩니다."
      />

      <div className="mt-8 space-y-6">
        <UrlInput
          value={url}
          onChange={setUrl}
          onSubmit={() => void importProduct()}
          loading={loading}
        />

        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <LoadingSpinner size="sm" />
            파이프라인 실행 중...
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
            <Button variant="outline" size="sm" className="ml-4" onClick={() => void retry()}>
              재시도
            </Button>
          </div>
        )}

        {result && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <PipelineStatus steps={result.steps} running={loading} />
              <ProductPreview
                extracted={result.extracted}
                draft={draft ?? undefined}
                editable={!!draft}
                onEdit={updateDraftField}
              />
            </div>
            <div className="space-y-6">
              <ImagePreview
                images={result.optimizedImages}
                extractedImages={result.extracted?.images}
              />
              <AiPreview content={result.aiContent} />
              <UploadResult draft={draft ?? undefined} onRetry={() => void retry()} />
              <PipelineLogs logs={result.logs} />
            </div>
          </div>
        )}

        {draft && result?.success && (
          <div className="flex justify-end">
            <Button onClick={() => void saveDraft()} disabled={loading}>
              네이버 초안 저장
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
