'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

import type { AiProductContent } from '../types';

type AiPreviewProps = {
  content?: AiProductContent;
};

export function AiPreview({ content }: AiPreviewProps) {
  if (!content) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">AI 생성 콘텐츠</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">제목</p>
          <p className="font-medium">{content.title}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">요약</p>
          <p className="text-sm">{content.summary}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">SEO 키워드</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {content.seoKeywords.map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
