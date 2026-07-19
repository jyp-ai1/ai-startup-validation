'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

import type { ProductDraft } from '../types';

type UploadResultProps = {
  draft?: ProductDraft;
  uploadResult?: {
    productId: string;
    status: string;
    url: string;
    savedPath: string;
  };
  onRetry?: () => void;
};

export function UploadResult({ draft, uploadResult, onRetry }: UploadResultProps) {
  if (!draft && !uploadResult) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">업로드 결과</CardTitle>
          {uploadResult && (
            <Badge variant="secondary">{uploadResult.status}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {uploadResult && (
          <>
            <div>
              <p className="text-xs text-muted-foreground">상품 ID</p>
              <p className="font-mono text-sm">{uploadResult.productId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">저장 경로</p>
              <p className="truncate text-xs font-mono">{uploadResult.savedPath}</p>
            </div>
          </>
        )}
        {draft && (
          <div>
            <p className="text-xs text-muted-foreground">Draft ID</p>
            <p className="font-mono text-sm">{draft.id}</p>
          </div>
        )}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
