'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '@repo/ui';

import type { ExtractedProduct, ProductDraft } from '../types';

type ProductPreviewProps = {
  extracted?: ExtractedProduct;
  draft?: ProductDraft;
  editable?: boolean;
  onEdit?: (field: keyof ProductDraft['product'], value: string) => void;
};

export function ProductPreview({ extracted, draft, editable, onEdit }: ProductPreviewProps) {
  const product = draft?.product;
  const title = product?.title ?? extracted?.title ?? '';
  const description = product?.description ?? extracted?.description ?? '';
  const price = product?.price ?? extracted?.price ?? 0;
  const currency = product?.currency ?? extracted?.currency ?? 'KRW';
  const options = product?.options ?? extracted?.options ?? [];

  if (!extracted && !draft) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">상품 미리보기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">상품명</label>
          {editable && onEdit ? (
            <Input
              value={title}
              onChange={(e) => onEdit('title', e.target.value)}
              className="mt-1"
            />
          ) : (
            <p className="mt-1 font-semibold">{title}</p>
          )}
        </div>

        <div className="flex gap-4">
          <div>
            <span className="text-xs text-muted-foreground">가격</span>
            <p className="font-medium">{price.toLocaleString()} {currency}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">브랜드</span>
            <p>{product?.brand ?? extracted?.brand}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">카테고리</span>
            <p>{product?.category ?? extracted?.category}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">설명</label>
          {editable && onEdit ? (
            <Textarea
              value={description}
              onChange={(e) => onEdit('description', e.target.value)}
              rows={6}
              className="mt-1"
            />
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm">{description}</p>
          )}
        </div>

        {options.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">옵션</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.map((opt) => (
                <Badge key={opt.name} variant="secondary">
                  {opt.name}: {opt.values.join(', ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
