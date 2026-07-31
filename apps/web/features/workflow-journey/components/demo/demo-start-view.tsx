'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { clearAllDemoClientState } from '../../lib/demo-guided-session';
import {
  DEMO_CUSTOM_DOCUMENT_KEY,
  DEMO_SAMPLES,
  DEMO_SESSION_PROJECT_ID,
  type DemoSampleId,
} from '../../lib/demo-samples';
import {
  persistDemoProjectDraftForLogin,
  type DemoProjectDraft,
} from '../../lib/v2-demo-project-store';
import { extractDocumentEntities } from '../../lib/domain/extract-document-entities';

type DemoStartViewProps = {
  className?: string;
};

function buildDraftFromDocument(content: string): DemoProjectDraft {
  const entities = extractDocumentEntities(content);
  const serviceName =
    entities.business.name?.trim() ||
    entities.business.value?.trim() ||
    content.split('\n')[0]?.trim() ||
    '내 프로젝트';
  const tagline =
    entities.business.value?.trim() ||
    entities.product.value?.trim() ||
    'LaunchLens Demo에서 시작한 프로젝트';

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

  return (
    <div className={cn('mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14', className)}>
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden />
          </span>
          LaunchLens
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Demo 시작</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          샘플로 체험하거나, 내 사업 문서로 바로 AI 분석을 시작할 수 있습니다.
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
            <p className="mt-3 text-lg font-semibold">LaunchLens Sample 체험하기</p>
            <p className="mt-2 text-sm text-muted-foreground">
              SaaS · F&B · 커머스 · 제조 예시 중 선택 후 Read → Review까지 체험
            </p>
          </button>
          <button
            type="button"
            className="rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary/40 hover:bg-primary/[0.03]"
            onClick={() => setMode('custom')}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">②</p>
            <p className="mt-3 text-lg font-semibold">내 사업으로 직접 체험하기</p>
            <p className="mt-2 text-sm text-muted-foreground">
              문서 붙여넣기 → AI Read → Review → 로그인하면 내 프로젝트로 저장
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
              AI 분석 시작
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'custom' ? (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4" aria-hidden />
              사업 문서 붙여넣기
            </span>
            <textarea
              value={customDocument}
              onChange={(event) => setCustomDocument(event.target.value)}
              rows={12}
              placeholder="서비스명, 창업자, 사업 설명, 타깃 고객, 수익 모델 등을 붙여넣으세요."
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setMode('pick')}>
              뒤로
            </Button>
            <Button
              type="button"
              disabled={customDocument.trim().length < 8}
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
