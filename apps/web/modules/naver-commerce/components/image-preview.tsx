'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

import type { OptimizedImages } from '../types';

type ImagePreviewProps = {
  images?: OptimizedImages;
  extractedImages?: string[];
};

export function ImagePreview({ images, extractedImages }: ImagePreviewProps) {
  const paths = images?.webp?.length ? images.webp : extractedImages ?? [];
  const count = paths.length;

  if (count === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">이미지</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">이미지 없음</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">이미지 미리보기</CardTitle>
          <Badge>{count}장</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {images?.thumbnail && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">대표 이미지</p>
            <p className="truncate text-xs font-mono">{images.thumbnail}</p>
          </div>
        )}
        <ul className="space-y-1">
          {paths.map((p) => (
            <li key={p} className="truncate text-xs font-mono text-muted-foreground">
              {p.split(/[/\\]/).pop()}
            </li>
          ))}
        </ul>
        {images?.zipPath && (
          <p className="text-xs text-muted-foreground">ZIP: {images.zipPath.split(/[/\\]/).pop()}</p>
        )}
      </CardContent>
    </Card>
  );
}
