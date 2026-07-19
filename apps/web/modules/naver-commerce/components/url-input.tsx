'use client';

import { Button, Input } from '@repo/ui';

type UrlInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function UrlInput({ value, onChange, onSubmit, loading, disabled }: UrlInputProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        placeholder="상품 URL 입력 (개발: test 입력 시 로컬 픽스처 사용)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        disabled={disabled || loading}
        className="flex-1"
      />
      <Button onClick={onSubmit} disabled={disabled || loading || !value.trim()}>
        {loading ? '가져오는 중...' : '상품 가져오기'}
      </Button>
    </div>
  );
}
