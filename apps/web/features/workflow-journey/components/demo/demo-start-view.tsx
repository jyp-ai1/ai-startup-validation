'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardPaste, FileText, Loader2, Upload } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { AlabomLogo } from '@/lib/brand/alabom-logo';
import { BRAND_CONFIG } from '@/lib/brand/brand-config';

import {
  detectWorkspaceDocumentPlaceholder,
  isWorkspaceDocumentAnalyzable,
  looksLikeDocumentFileName,
} from '../../lib/business-understanding/workspace-document-eligibility';
import { clearAllDemoClientState } from '../../lib/demo-guided-session';
import {
  DEMO_CUSTOM_DOCUMENT_KEY,
  DEMO_SAMPLES,
  DEMO_SESSION_PROJECT_ID,
  type DemoSampleId,
} from '../../lib/demo-samples';
import { readSmartIntakeFile } from '../../lib/v2-smart-intake-engine';
import {
  persistDemoProjectDraftForLogin,
  type DemoProjectDraft,
} from '../../lib/v2-demo-project-store';
import { extractDocumentEntities } from '../../lib/domain/extract-document-entities';

type DemoStartViewProps = {
  className?: string;
};

function safeServiceName(content: string): string {
  const entities = extractDocumentEntities(content);
  const candidates = [
    entities.business.name?.trim(),
    entities.business.value?.trim(),
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.length >= 2 && !looksLikeDocumentFileName(candidate)) {
      return candidate;
    }
  }
  return '내 프로젝트';
}

function buildDraftFromDocument(content: string): DemoProjectDraft {
  const entities = extractDocumentEntities(content);
  const serviceName = safeServiceName(content);
  const tagline =
    entities.product.value?.trim() ||
    (entities.business.value?.trim() && !looksLikeDocumentFileName(entities.business.value)
      ? entities.business.value.trim()
      : null) ||
    'ALABOM Demo에서 시작한 프로젝트';

  return {
    serviceName,
    tagline,
    customer: entities.customer.value?.trim() ?? '',
    problem: '',
    pastedContent: content,
    importSource: 'paste',
  };
}

function startDemoWorkspace(sample: DemoSampleId, customDocument?: string): void {
  clearAllDemoClientState(DEMO_SESSION_PROJECT_ID);

  if (sample === 'custom' && customDocument?.trim()) {
    const trimmed = customDocument.trim();
    sessionStorage.setItem(DEMO_CUSTOM_DOCUMENT_KEY, trimmed);
    persistDemoProjectDraftForLogin(buildDraftFromDocument(trimmed));
  }

  const params = new URLSearchParams({
    demo: 'guided',
    sample,
    fresh: '1',
  });
  window.location.assign(`/workspace?${params.toString()}`);
}

export function DemoStartView({ className }: DemoStartViewProps) {
  const [mode, setMode] = useState<'pick' | 'sample' | 'custom'>('pick');
  const [selectedSample, setSelectedSample] = useState<DemoSampleId>('launchlens');
  const [customDocument, setCustomDocument] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canStartCustom = isWorkspaceDocumentAnalyzable(customDocument);
  const isPlaceholderDoc =
    canStartCustom && detectWorkspaceDocumentPlaceholder(customDocument) != null;
  const hasWeakPaste = customDocument.trim().length > 0 && !canStartCustom;

  const applyFileText = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const { text } = await readSmartIntakeFile(file);
      // S15 P0-1 — accept analyzable docs (incl. PDF placeholder) → Trust Block in Workspace
      if (!isWorkspaceDocumentAnalyzable(text)) {
        setError('문서 내용이 부족합니다. 사업 설명을 더 추가해 주세요.');
        setFileName(null);
        return;
      }
      setCustomDocument(text);
      setFileName(file.name);
    } catch {
      setError('문서를 읽을 수 없습니다. TXT, PDF, DOCX를 사용해 주세요.');
      setFileName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className={cn('mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14', className)}>
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex" aria-label={BRAND_CONFIG.displayName}>
          <AlabomLogo withWordmark markClassName="size-8" className="gap-2 text-sm" />
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Demo 시작</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          사업 문서를 먼저 올리면 AI PM이 읽기부터 시작합니다. 프로젝트 이름만으로는 분석하지 않습니다.
        </p>
      </div>

      {mode === 'pick' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary/40 hover:bg-primary/[0.03]"
            onClick={() => setMode('sample')}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">①</p>
            <p className="mt-3 text-lg font-semibold">ALABOM Sample 체험하기</p>
            <p className="mt-2 text-sm text-muted-foreground">
              SaaS · F&B · 커머스 · 제조 예시 문서로 Read → Review까지 체험
            </p>
          </button>
          <button
            type="button"
            className="rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary/40 hover:bg-primary/[0.03]"
            onClick={() => setMode('custom')}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">②</p>
            <p className="mt-3 text-lg font-semibold">내 사업 문서로 체험하기</p>
            <p className="mt-2 text-sm text-muted-foreground">
              파일 업로드 또는 붙여넣기 → AI Reading → Review
            </p>
          </button>
        </div>
      ) : null}

      {mode === 'sample' ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {DEMO_SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => setSelectedSample(sample.id)}
                className={cn(
                  'rounded-xl border px-4 py-4 text-left transition',
                  selectedSample === sample.id
                    ? 'border-primary bg-primary/[0.06]'
                    : 'border-border hover:border-primary/30',
                )}
              >
                <p className="font-medium">{sample.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sample.projectName}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setMode('pick')}>
              뒤로
            </Button>
            <Button type="button" onClick={() => startDemoWorkspace(selectedSample)}>
              샘플 문서로 AI Read 시작
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'custom' ? (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void applyFileText(file);
              event.target.value = '';
            }}
          />

          <button
            type="button"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void applyFileText(file);
            }}
            className={cn(
              'flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              dragOver
                ? 'border-primary bg-primary/10'
                : 'border-primary/35 bg-primary/[0.03] hover:border-primary/50 hover:bg-primary/[0.06]',
            )}
          >
            {loading ? (
              <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
            ) : (
              <Upload className="size-10 text-primary" aria-hidden />
            )}
            <p className="mt-4 text-base font-semibold">사업계획서 파일 업로드</p>
            <p className="mt-1 text-sm text-muted-foreground">PDF, Word, TXT, Markdown</p>
            {fileName ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-background/80 px-3 py-1.5 text-sm font-medium">
                <FileText className="size-4 text-primary" aria-hidden />
                {fileName}
              </p>
            ) : null}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <p className="relative mx-auto w-fit bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
              또는 붙여넣기
            </p>
          </div>

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ClipboardPaste className="size-4" aria-hidden />
              사업 문서 붙여넣기
            </span>
            <textarea
              value={customDocument}
              onChange={(event) => {
                setCustomDocument(event.target.value);
                if (event.target.value.trim()) setFileName(null);
              }}
              rows={10}
              placeholder="창업자, 사업 설명, 고객, 문제, 수익 모델 등 — 두 줄 이상 또는 충분한 설명"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
            />
          </label>

          {isPlaceholderDoc ? (
            <p className="text-sm text-amber-800 dark:text-amber-200" role="status">
              파일 본문은 아직 추출되지 않았습니다. 시작 후 Trust Block에서 함께 확인하고 Shared
              Understanding으로 이어집니다. 파일명은 사업명이 되지 않습니다.
            </p>
          ) : null}

          {hasWeakPaste ? (
            <p className="text-sm text-amber-800 dark:text-amber-200" role="status">
              분석할 정보가 부족합니다. 프로젝트 이름만으로는 AI Read를 시작하지 않습니다.
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setMode('pick')}>
              뒤로
            </Button>
            <Button
              type="button"
              disabled={!canStartCustom || loading}
              onClick={() => startDemoWorkspace('custom', customDocument)}
            >
              AI Read 시작
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
