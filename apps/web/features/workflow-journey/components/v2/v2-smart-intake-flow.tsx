'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, ChevronUp, ClipboardPaste, Loader2, Star, TrendingUp } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  SMART_INTAKE_ACCEPTED_EXTENSIONS,
  SMART_INTAKE_DAILY_MONITORING,
  SMART_INTAKE_EXTRACTED_FIELDS,
  SMART_INTAKE_MAX_CHARS,
  SMART_INTAKE_MISSING_FIELDS,
  SMART_INTAKE_PRICE_LEVELS,
  SMART_INTAKE_PRICING_CHOICES,
  SMART_INTAKE_STATUS_MESSAGES,
  SMART_INTAKE_SUPPORTED_FORMATS,
  SMART_INTAKE_WORKING_MS,
  SMART_INTAKE_WORKING_STEPS,
} from '../../lib/v2-smart-intake-data';
import {
  analyzeSmartIntakeDocument,
  buildDraftFromAnalysis,
  isSmartIntakeContentValid,
  readSmartIntakeFile,
} from '../../lib/v2-smart-intake-engine';
import type {
  SmartIntakeAnalysis,
  SmartIntakePriceLevelChoice,
  SmartIntakePricingChoice,
} from '../../lib/v2-smart-intake-types';
import {
  saveDemoProjectDraft,
  type DemoProjectDraft,
} from '../../lib/v2-demo-project-store';
import type { DemoExperienceStep } from '../../lib/v2-demo-experience-types';
import {
  buildSmartIntakeReasonChain,
  getChainStepsUpTo,
} from '../../lib/v2-reason-chain-engine';
import {
  buildSmartIntakeInvestigationContext,
  mapWorkingStepsToLiveProgress,
} from '../../lib/v2-investigation-engine';
import { buildDocumentReviewIntro } from '@/lib/ai/ai-response-sanitizer';
import { V2DocumentCitationBlock, V2DocumentProfileSummary } from './v2-document-citation-block';
import { V2DomainEntityBasisPanel } from './v2-domain-entity-basis-panel';
import { V2EvidenceMetadataCard } from './v2-evidence-metadata-card';
import { V2InvestigationDiscoveries } from './v2-investigation-discoveries';
import { V2InvestigationLog } from './v2-investigation-log';
import { V2LiveInvestigation } from './v2-live-investigation';
import { V2PmReport } from './v2-pm-report';
import { V2ReasonChainBridge } from './v2-reason-chain-bridge';
import { V2SmartQuestionBlock } from './v2-smart-question-block';

type QuestionPhase = 'gapReview' | 'pricingModel' | 'priceLevel';

function needsPriceLevel(choice: SmartIntakePricingChoice | null): boolean {
  return (
    choice === 'subscription' ||
    choice === 'oneTime' ||
    choice === 'usageBased' ||
    choice === 'enterprise'
  );
}

type V2SmartIntakeFlowProps = {
  step: DemoExperienceStep;
  projectDraft: DemoProjectDraft;
  onDraftChange: (draft: DemoProjectDraft) => void;
  onStepChange: (step: DemoExperienceStep) => void;
  onAdvance: () => void;
  AiPmBubble: (props: { children: ReactNode; className?: string }) => ReactNode;
  StarRating: (props: { count: number }) => ReactNode;
};

export function V2SmartIntakeFlow({
  step,
  projectDraft,
  onDraftChange,
  onStepChange,
  onAdvance,
  AiPmBubble,
  StarRating,
}: V2SmartIntakeFlowProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.smartIntake');
  const tChain = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.reasonChain');
  const tInv = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.investigation');
  const [pasteContent, setPasteContent] = useState('');
  const [analysis, setAnalysis] = useState<SmartIntakeAnalysis | null>(null);
  const [importFileName, setImportFileName] = useState<string | undefined>();
  const [pricingChoice, setPricingChoice] = useState<SmartIntakePricingChoice | null>(null);
  const [priceLevelChoice, setPriceLevelChoice] = useState<SmartIntakePriceLevelChoice | null>(null);
  const [questionPhase, setQuestionPhase] = useState<QuestionPhase>('gapReview');
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [workingProgress, setWorkingProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectName = projectDraft.serviceName.trim() || t('fallbackName');
  const charCount = pasteContent.length;

  const reasonChain = useMemo(() => {
    if (!analysis) return null;
    return buildSmartIntakeReasonChain(
      analysis,
      projectDraft.importSource ?? 'paste',
      projectDraft.fileName ?? importFileName,
    );
  }, [analysis, projectDraft.importSource, projectDraft.fileName, importFileName]);

  const investigation = useMemo(() => {
    if (!analysis) return null;
    return buildSmartIntakeInvestigationContext(
      analysis,
      projectDraft.importSource ?? 'paste',
      projectDraft.fileName ?? importFileName,
    );
  }, [analysis, projectDraft.importSource, projectDraft.fileName, importFileName]);

  const liveInvestigationProgress = mapWorkingStepsToLiveProgress(
    completedSteps,
    SMART_INTAKE_WORKING_STEPS.length,
    investigation?.liveSteps ?? [],
  );
  const smartQuestion = investigation?.smartQuestions[0] ?? null;

  const persistDraft = (
    pricingModel?: SmartIntakePricingChoice,
    priceLevel?: string,
  ) => {
    if (!analysis) return;
    const draft = buildDraftFromAnalysis(
      analysis,
      pasteContent,
      projectDraft.importSource ?? 'paste',
      pricingModel ?? pricingChoice ?? undefined,
      projectDraft.fileName ?? importFileName,
      priceLevel ?? priceLevelChoice ?? undefined,
    );
    onDraftChange(draft);
    saveDemoProjectDraft(draft);
  };

  const handlePricingSelect = (choice: SmartIntakePricingChoice) => {
    setPricingChoice(choice);
    persistDraft(choice);
    if (needsPriceLevel(choice)) {
      setQuestionPhase('priceLevel');
    }
  };

  const handlePriceLevelSelect = (level: SmartIntakePriceLevelChoice) => {
    setPriceLevelChoice(level);
    persistDraft(undefined, level);
  };

  useEffect(() => {
    if (step !== 'smartIntakeWorking') return;

    setWorkingProgress(0);
    setCompletedSteps(0);
    setStatusIndex(0);

    const stepInterval = window.setInterval(() => {
      setCompletedSteps((prev) => Math.min(prev + 1, SMART_INTAKE_WORKING_STEPS.length));
    }, SMART_INTAKE_WORKING_MS / SMART_INTAKE_WORKING_STEPS.length);

    const progressInterval = window.setInterval(() => {
      setWorkingProgress((prev) => Math.min(prev + 2, 100));
    }, SMART_INTAKE_WORKING_MS / 50);

    const statusInterval = window.setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % SMART_INTAKE_STATUS_MESSAGES.length);
    }, 2200);

    const timer = window.setTimeout(() => {
      onStepChange('documentUnderstanding');
    }, SMART_INTAKE_WORKING_MS);

    return () => {
      window.clearInterval(stepInterval);
      window.clearInterval(progressInterval);
      window.clearInterval(statusInterval);
      window.clearTimeout(timer);
    };
  }, [step, onStepChange]);

  const handleAnalyze = () => {
    if (!isSmartIntakeContentValid(pasteContent)) return;
    const result = analyzeSmartIntakeDocument(pasteContent, 'paste');
    setAnalysis(result);
    setImportFileName(undefined);
    const draft = buildDraftFromAnalysis(result, pasteContent, 'paste');
    onDraftChange(draft);
    saveDemoProjectDraft(draft);
    onStepChange('smartIntakeWorking');
  };

  const handleFileUpload = async (file: File) => {
    const { text, source, fileName } = await readSmartIntakeFile(file);
    setImportFileName(fileName);
    setPasteContent(text.slice(0, SMART_INTAKE_MAX_CHARS));
    const result = analyzeSmartIntakeDocument(text, source);
    setAnalysis(result);
    const draft = buildDraftFromAnalysis(result, text, source, undefined, fileName);
    onDraftChange(draft);
    saveDemoProjectDraft(draft);
    onStepChange('smartIntakeWorking');
  };

  if (step === 'smartIntake') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-background px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t('title')}</p>
          <p className="mt-2 text-sm font-medium">{t('lead')}</p>
          <ul className="mt-3 space-y-1.5">
            {SMART_INTAKE_SUPPORTED_FORMATS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-3 shrink-0 text-primary" aria-hidden />
                {t(`supportedFormats.${item}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.03] p-4">
          <label htmlFor="smart-intake-paste" className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardPaste className="size-4 text-primary" aria-hidden />
            {t('pasteLabel')}
          </label>
          <textarea
            id="smart-intake-paste"
            rows={6}
            maxLength={SMART_INTAKE_MAX_CHARS}
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder={t('pastePlaceholder')}
            className="mt-3 min-h-[140px] w-full resize-y rounded-xl border border-border/70 bg-background px-4 py-3 text-sm outline-none ring-primary/30 focus:ring-2"
          />
          <p className="mt-2 text-right text-xs text-muted-foreground">
            {t('charCount', { count: charCount, max: SMART_INTAKE_MAX_CHARS })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['pdf', 'docx', 'txt', 'md'] as const).map((fmt) => (
            <Button
              key={fmt}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => fileInputRef.current?.click()}
            >
              {t(`fileFormats.${fmt}`)}
            </Button>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            accept={SMART_INTAKE_ACCEPTED_EXTENSIONS.join(',')}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = '';
            }}
          />
        </div>

        <Button
          type="button"
          className="w-full rounded-lg"
          disabled={!isSmartIntakeContentValid(pasteContent)}
          onClick={handleAnalyze}
        >
          {t('analyzeCta')}
        </Button>
      </div>
    );
  }

  if (step === 'smartIntakeWorking' && investigation) {
    const statusKey = SMART_INTAKE_STATUS_MESSAGES[statusIndex] ?? 'understandingDoc';
    return (
      <div className="space-y-4">
        <V2LiveInvestigation
          steps={investigation.liveSteps}
          completedCount={liveInvestigationProgress}
        />

        <div className="rounded-xl border border-border/60 bg-muted/10 px-5 py-6">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${workingProgress}%` }}
            />
          </div>
          <p className="mt-4 text-center text-sm font-medium">{t('working.title')}</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {t(`working.status.${statusKey}`)}
          </p>
        </div>

        <ul className="space-y-2 rounded-xl border border-border/40 bg-muted/5 p-4">
          {SMART_INTAKE_WORKING_STEPS.map((item, index) => (
            <li key={item} className="flex items-center gap-2 text-sm">
              {index < completedSteps ? (
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              )}
              <span className={index < completedSteps ? 'text-foreground' : 'text-muted-foreground'}>
                {t(`working.steps.${item}`)}
              </span>
            </li>
          ))}
        </ul>

        <AiPmBubble>
          <p className="font-medium">{t('working.signatureTitle')}</p>
          <p className="text-muted-foreground">{t('working.signatureBody')}</p>
        </AiPmBubble>
      </div>
    );
  }

  if (step === 'documentUnderstanding' && analysis && reasonChain && investigation) {
    return (
      <div className="space-y-4">
        <V2InvestigationLog entries={investigation.logEntries} compact variant="workJournal" />

        {reasonChain.documentProfile ? (
          <V2DocumentProfileSummary profile={reasonChain.documentProfile} />
        ) : null}

        <V2ReasonChainBridge
          steps={getChainStepsUpTo(reasonChain, 'reviewFocus')}
          activeStep="reviewFocus"
        />

        <AiPmBubble>
          <p className="font-medium">
            {analysis.domainTrust.mustConfirmCustomer
              ? t('understanding.trustConfirmLead')
              : reasonChain.documentProfile
                ? buildDocumentReviewIntro()
                : t('understanding.lead1')}
          </p>
          <p>
            {analysis.domainTrust.mustConfirmCustomer
              ? t('understanding.trustConfirmBody')
              : t('understanding.lead2')}
          </p>
        </AiPmBubble>

        <V2DomainEntityBasisPanel entities={analysis.entities} trust={analysis.domainTrust} />

        <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('understanding.extractedTitle')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {SMART_INTAKE_EXTRACTED_FIELDS.map((field) => (
              <li key={field} className="flex items-center gap-2 text-sm">
                {analysis.extracted[field] ? (
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <span className="size-4 shrink-0 text-muted-foreground">□</span>
                )}
                {t(`understanding.fields.${field}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
            {t('understanding.missingTitle')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {SMART_INTAKE_MISSING_FIELDS.map((field) => (
              <li key={field} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">□</span>
                {t(`understanding.missing.${field}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/[0.04] px-4 py-3">
          <span className="text-sm text-muted-foreground">{t('understanding.basisLabel')}</span>
          <StarRating count={analysis.completenessStars} />
        </div>

        <Button type="button" className="w-full rounded-lg" onClick={onAdvance}>
          {analysis.domainTrust.mustConfirmCustomer
            ? t('understanding.confirmCustomerCta')
            : t('understanding.cta')}
        </Button>
      </div>
    );
  }

  if (step === 'firstQuestion' && reasonChain && investigation) {
    const canContinue =
      pricingChoice &&
      (!needsPriceLevel(pricingChoice) || priceLevelChoice);

    return (
      <div className="space-y-4">
        <V2ReasonChainBridge
          steps={getChainStepsUpTo(reasonChain, 'butGap')}
          activeStep="butGap"
        />

        {questionPhase === 'gapReview' ? (
          <>
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('firstQuestion.gapReviewTitle')}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {SMART_INTAKE_EXTRACTED_FIELDS.map((field) => (
                  <li key={field} className="flex items-center gap-2">
                    {analysis?.extracted[field] ? (
                      <Check className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <span className="size-4 shrink-0 text-muted-foreground">□</span>
                    )}
                    {t(`firstQuestion.gapFields.${field}`)}
                  </li>
                ))}
                {analysis?.missing.map((field) => (
                  <li key={field} className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <span className="size-4 shrink-0">□</span>
                    {t(`firstQuestion.gapMissing.${field}`)}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              type="button"
              className="w-full rounded-lg"
              onClick={() => setQuestionPhase('pricingModel')}
            >
              {t('firstQuestion.gapReviewCta')}
            </Button>
          </>
        ) : null}

        {questionPhase !== 'gapReview' && smartQuestion ? (
          <V2SmartQuestionBlock
            question={smartQuestion}
            citations={reasonChain.citations}
          />
        ) : null}

        {questionPhase !== 'gapReview' ? (
          <V2DocumentCitationBlock
            citations={reasonChain.citations}
            highlightId={reasonChain.pricingGapCitationId}
          />
        ) : null}

        {questionPhase === 'pricingModel' ? (
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-2 w-full text-sm font-medium">{t('firstQuestion.pricingLabel')}</legend>
            {SMART_INTAKE_PRICING_CHOICES.map((choice) => (
              <Button
                key={choice}
                type="button"
                variant={pricingChoice === choice ? 'default' : 'outline'}
                className="h-auto min-h-10 rounded-xl px-3 py-2 text-sm"
                onClick={() => handlePricingSelect(choice)}
              >
                {t(`firstQuestion.pricing.${choice}`)}
              </Button>
            ))}
          </fieldset>
        ) : null}

        {questionPhase === 'priceLevel' && pricingChoice && needsPriceLevel(pricingChoice) ? (
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-2 w-full text-sm font-medium">{t('firstQuestion.priceLevelLabel')}</legend>
            {SMART_INTAKE_PRICE_LEVELS.map((level) => (
              <Button
                key={level}
                type="button"
                variant={priceLevelChoice === level ? 'default' : 'outline'}
                className="h-auto min-h-10 rounded-xl px-3 py-2 text-sm"
                onClick={() => handlePriceLevelSelect(level)}
              >
                {t(`firstQuestion.priceLevels.${level}`)}
              </Button>
            ))}
          </fieldset>
        ) : null}

        {canContinue ? (
          <Button type="button" className="w-full rounded-lg" onClick={onAdvance}>
            {t('firstQuestion.cta')}
          </Button>
        ) : null}
      </div>
    );
  }

  if (step === 'evidenceFirstReview' && reasonChain && investigation) {
    return (
      <div className="space-y-4">
        <AiPmBubble>
          <p className="font-medium">{tInv('reportFirst.lead')}</p>
          <p>{tInv('reportFirst.summary')}</p>
        </AiPmBubble>

        <V2InvestigationLog entries={investigation.logEntries} compact variant="workJournal" />

        <V2InvestigationDiscoveries items={investigation.discoveries} />

        <AiPmBubble>
          <p className="font-medium">{tInv('reportFirst.synthesis')}</p>
        </AiPmBubble>

        <V2ReasonChainBridge
          steps={getChainStepsUpTo(reasonChain, 'thereforeMarket')}
          activeStep="thereforeMarket"
        />

        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-background p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t('evidenceReview.recommendationLabel')}
          </p>
          <p className="mt-2 text-lg font-semibold">{t('evidenceReview.recommendation')}</p>
        </div>

        <div>
          <p className="text-sm font-semibold">{t('evidenceReview.whyLabel')}</p>
          <div className="mt-2 space-y-2">
            {reasonChain.evidence.map((item) => (
              <V2EvidenceMetadataCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <AiPmBubble>
          <p className="font-medium">{t('evidenceReview.reasonLead')}</p>
          <p>{t('evidenceReview.reasonBody', { name: projectName })}</p>
        </AiPmBubble>

        <AiPmBubble>
          <p className="font-medium">{t('resources.intro')}</p>
        </AiPmBubble>

        <div className="rounded-xl border border-border/40 bg-muted/5">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
            onClick={() => setResourcesOpen((open) => !open)}
          >
            {t('resources.toggle')}
            {resourcesOpen ? (
              <ChevronUp className="size-4" aria-hidden />
            ) : (
              <ChevronDown className="size-4" aria-hidden />
            )}
          </button>
          {resourcesOpen ? (
            <ul className="space-y-3 border-t border-border/40 px-4 py-3">
              {reasonChain.resources.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-medium">{t(`resources.items.${item.id}`)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(`resources.reasons.${item.id}`)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Button type="button" className="w-full rounded-lg" onClick={onAdvance}>
          {t('evidenceReview.cta')}
        </Button>
      </div>
    );
  }

  if (step === 'myProjectImprovement' && reasonChain && investigation) {
    return (
      <div className="space-y-4">
        <V2ReasonChainBridge
          steps={getChainStepsUpTo(reasonChain, 'thereforeImprovement')}
          activeStep="thereforeImprovement"
        />

        <AiPmBubble>
          <p className="font-medium">{t('improvement.lead', { name: projectName })}</p>
          <p className="mt-2 text-muted-foreground">{t('improvement.chainLead')}</p>
        </AiPmBubble>

        {investigation.hasDocument && reasonChain.citations.length > 0 ? (
          <V2DocumentCitationBlock
            citations={reasonChain.citations}
            highlightId={reasonChain.pricingGapCitationId}
          />
        ) : null}

        <div className="space-y-3 rounded-xl border border-border/40 bg-muted/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('improvement.marketFit')}</span>
            <div className="flex items-center gap-2">
              <StarRating count={3} />
              <TrendingUp className="size-3.5 text-primary" aria-hidden />
              <StarRating count={5} />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('improvement.reason')}</p>
        </div>

        <Button type="button" className="w-full rounded-lg" onClick={onAdvance}>
          {t('improvement.cta')}
        </Button>
      </div>
    );
  }

  if (step === 'dailyMonitoringPreview' && investigation) {
    return (
      <div className="space-y-4">
        <V2InvestigationLog
          entries={investigation.logEntries}
          namespace="investigationSample"
          variant="workJournal"
        />

        <V2InvestigationDiscoveries items={investigation.discoveries} />

        <V2PmReport stats={investigation.report} />

        <AiPmBubble>
          <p className="font-medium">{t('dailyPreview.line1')}</p>
          <p>{t('dailyPreview.line2')}</p>
        </AiPmBubble>

        <ul className="space-y-2 rounded-xl border border-border/40 bg-muted/5 p-4">
          {SMART_INTAKE_DAILY_MONITORING.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
              {t(`dailyPreview.items.${item}`)}
            </li>
          ))}
        </ul>

        <AiPmBubble>
          <p className="font-medium">{t('dailyPreview.closing')}</p>
        </AiPmBubble>

        <Button type="button" className="w-full rounded-lg" onClick={onAdvance}>
          {t('dailyPreview.cta')}
        </Button>
      </div>
    );
  }

  return null;
}
