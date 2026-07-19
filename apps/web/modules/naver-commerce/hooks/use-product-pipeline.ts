'use client';

import { useCallback, useState } from 'react';

import type { PipelineRunResult, ProductDraft } from '../types';

type UseProductPipelineReturn = {
  url: string;
  setUrl: (url: string) => void;
  loading: boolean;
  result: PipelineRunResult | null;
  draft: ProductDraft | null;
  error: string | null;
  importProduct: () => Promise<void>;
  saveDraft: () => Promise<void>;
  retry: () => Promise<void>;
  updateDraftField: (field: keyof ProductDraft['product'], value: string) => void;
};

export function useProductPipeline(): UseProductPipelineReturn {
  const [url, setUrl] = useState('test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/naver-commerce/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const envelope = (await res.json()) as {
        success: boolean;
        data?: PipelineRunResult;
        error?: { message: string };
      };

      if (!res.ok || !envelope.success || !envelope.data) {
        throw new Error(envelope.error?.message ?? 'Import failed');
      }

      setResult(envelope.data);
      if (envelope.data.draft) setDraft(envelope.data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [url]);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/naver-commerce/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      const envelope = (await res.json()) as {
        success: boolean;
        data?: { draft: ProductDraft };
        error?: { message: string };
      };
      if (!res.ok || !envelope.success || !envelope.data) {
        throw new Error(envelope.error?.message ?? 'Save failed');
      }
      setDraft(envelope.data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [draft]);

  const retry = useCallback(async () => {
    await importProduct();
  }, [importProduct]);

  const updateDraftField = useCallback(
    (field: keyof ProductDraft['product'], value: string) => {
      if (!draft) return;
      setDraft({
        ...draft,
        product: { ...draft.product, [field]: value },
      });
    },
    [draft],
  );

  return {
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
  };
}
