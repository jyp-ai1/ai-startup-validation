'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import type { AIReportGeneration } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { generateValidationReport } from '../actions/ai-report-actions';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { GenerationStatusBadge } from './generation-status-badge';

type AIReportGenerateButtonProps = {
  projectId: string;
  reportId: string;
  latestGeneration: AIReportGeneration | null;
};

export function AIReportGenerateButton({
  projectId,
  reportId,
  latestGeneration,
}: AIReportGenerateButtonProps) {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isProcessing = latestGeneration?.status === 'PROCESSING' || isPending;

  function handleGenerate() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await generateValidationReport(projectId, reportId);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        trackEvent(ANALYTICS_EVENTS.reportGenerate, {
          project_id: projectId,
          screen: `/projects/${projectId}/reports/${reportId}`,
        });
        trackEvent(ANALYTICS_EVENTS.decisionGenerate, {
          project_id: projectId,
          screen: `/projects/${projectId}/reports/${reportId}`,
        });
        setSuccessMessage(
          result.usedMock
            ? 'Report draft generated (mock mode — configure AI API keys for LLM output).'
            : 'AI report draft generated successfully.',
        );
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleGenerate} disabled={isProcessing}>
          <Sparkles className="size-4" />
          {isProcessing ? 'Generating...' : 'AI Report 생성'}
        </Button>
        {latestGeneration ? (
          <GenerationStatusBadge status={latestGeneration.status} />
        ) : null}
      </div>

      {latestGeneration?.status === 'FAILED' && latestGeneration.errorMessage ? (
        <p className="text-sm text-destructive">{latestGeneration.errorMessage}</p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {successMessage ? (
        <p className="text-sm text-muted-foreground">{successMessage}</p>
      ) : null}

      {latestGeneration?.status === 'COMPLETED' ? (
        <p className="text-xs text-muted-foreground">
          Last generated: {new Date(latestGeneration.createdAt).toLocaleString('ko-KR')}
          {' · '}
          {latestGeneration.provider} / {latestGeneration.model}
        </p>
      ) : null}
    </div>
  );
}
