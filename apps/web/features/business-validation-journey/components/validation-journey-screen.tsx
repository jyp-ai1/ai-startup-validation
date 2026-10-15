'use client';

import { useEffect, useState } from 'react';

import { Button, Input, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';

import { acceptanceSummary, liveScreenStatus } from '../lib/analysis-acceptance';
import { screenStateContract } from '../lib/execution-contract';
import { LEDGER_SCREEN_EMPTY } from '../lib/execution-ledger';
import { liveCitationTrace, sourceCheckLabel } from '../lib/citation-reconciliation';
import { acceptPastedAnalysis, nextHandoffInput, prepareAnalysisRequest } from '../lib/external-handoff';
import { attachFounderSource, SOURCE_HYPOTHESES, sourceHash } from '../lib/founder-source';
import { applyAnswer, correctField, recordCounterClaim, replayStoredAnswer, startFromBusinessPlan, startJourney } from '../lib/journey-engine';
import { blockersToClose, decisionSnapshot, LMULM_PLAN_FIXTURE, RIDM_PLAN_FIXTURE, withFixtureResult } from '../lib/plan-journey';
import { contextRoleLabel, executionBadgeLabel } from '../lib/present-execution';
import { verificationActionFor } from '../lib/verification-action';
import { loadJourneyDraft, saveJourneyDraft } from '../lib/journey-session';
import {
  emptyIntake,
  EVIDENCE_OPTIONS,
  PAYER_OPTIONS,
  PROTOTYPE_NOTE,
  PROVISIONAL_NOTE,
  REVENUE_OPTIONS,
  TEST_HYPOTHESIS_INTAKE,
  type AnalysisProvenance,
  type EvidenceChoice,
  type Intake,
  type JourneySource,
  type JourneyState,
  type PayerChoice,
  type RequiredField,
  type RevenueChoice,
} from '../lib/journey-types';

const REQUIRED_LABEL: Record<RequiredField, string> = {
  business: '어떤 사업인가요?',
  customer: '주요 고객은 누구인가요?',
  problem: '고객의 어떤 문제를 해결하나요?',
};

export function ValidationJourneyScreen() {
  const [intake, setIntake] = useState<Intake>(emptyIntake());
  const [source, setSource] = useState<JourneySource>('founder_input');
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [view, setView] = useState<'form' | 'understanding'>('form');
  const [missing, setMissing] = useState<RequiredField[]>([]);
  const [choiceId, setChoiceId] = useState('');
  const [freeText, setFreeText] = useState('');
  const [answerMessage, setAnswerMessage] = useState('');
  const [customerDraft, setCustomerDraft] = useState('');
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [planText, setPlanText] = useState('');
  const [planSource, setPlanSource] = useState('사업계획서 발췌');
  const [planProvenance, setPlanProvenance] = useState<AnalysisProvenance>('test_fixture');
  const [planError, setPlanError] = useState('');

  useEffect(() => {
    const saved = loadJourneyDraft();
    if (!saved) return;
    setJourney(saved);
    setIntake(saved.intake);
    setSource(saved.source);
    setCustomerDraft(saved.intake.customer);
    setView('understanding');
  }, []);

  function updateIntake<K extends keyof Intake>(key: K, value: Intake[K]) {
    setIntake((current) => ({ ...current, [key]: value }));
  }

  function fillHypothesis() {
    setIntake(TEST_HYPOTHESIS_INTAKE);
    setSource('test_hypothesis');
    setMissing([]);
  }

  function beginPlan(text: string, provenance: AnalysisProvenance) {
    const result = startFromBusinessPlan({
      text,
      sourceLabel: planSource,
      provenance,
    });
    if (!result.ok) {
      setPlanError('LMULM 또는 RIDM 사업계획서 문장과 출처가 있어야 구조화한다.');
      return;
    }
    setPlanError('');
    setIntake(result.state.intake);
    setSource(result.state.source);
    setJourney(result.state);
    setChoiceId('');
    setFreeText('');
    setAnswerMessage('');
    setCorrectionMessage('');
    setCustomerDraft(result.state.intake.customer);
    setView('understanding');
    saveJourneyDraft(result.state);
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyStarted, {
      screen: '/business-validation',
      status: 'research_not_run',
      category: result.state.planCase?.profile,
    });
  }

  function onStartPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginPlan(planText, planProvenance);
  }

  function onStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = startJourney(intake, source);
    if (!result.ok) {
      setMissing(result.missing);
      return;
    }
    setMissing([]);
    setJourney(result.state);
    setChoiceId('');
    setFreeText('');
    setAnswerMessage('');
    setCorrectionMessage('');
    setCustomerDraft(result.state.intake.customer);
    setView('understanding');
    saveJourneyDraft(result.state);
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyStarted, {
      screen: '/business-validation',
      status: 'research_not_run',
    });
  }

  function onAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!journey) return;
    const result = applyAnswer(journey, {
      choiceId,
      freeText,
      now: new Date().toISOString(),
    });
    if (!result.applied) {
      setAnswerMessage(result.reason);
      return;
    }
    setJourney(result.state);
    setAnswerMessage(result.reason);
    setChoiceId('');
    setFreeText('');
    saveJourneyDraft(result.state);
    const latest = result.state.answers[result.state.answers.length - 1];
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyAnswered, {
      screen: '/business-validation',
      status: 'research_not_run',
      question_id: latest?.uncertaintyId,
      category: latest?.grade,
    });
  }

  function onCorrect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!journey) return;
    const result = correctField(journey, 'customer', customerDraft, new Date().toISOString());
    if (!result.applied) {
      setCorrectionMessage(result.reason);
      return;
    }
    setJourney(result.state);
    setCustomerDraft(result.state.intake.customer);
    setCorrectionMessage(result.reason);
    saveJourneyDraft(result.state);
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyAnswered, {
      screen: '/business-validation',
      status: 'research_not_run',
      question_id: 'h-customer',
      category: result.state.revisions.at(-1)?.delta,
    });
  }

  if (view === 'understanding' && journey) {
    return (
      <UnderstandingView
        journey={journey}
        choiceId={choiceId}
        freeText={freeText}
        answerMessage={answerMessage}
        customerDraft={customerDraft}
        correctionMessage={correctionMessage}
        onChoice={setChoiceId}
        onFreeText={setFreeText}
        onAnswer={onAnswer}
        onCustomerDraft={setCustomerDraft}
        onCorrect={onCorrect}
        onJourneyChange={(next) => {
          setJourney(next);
          saveJourneyDraft(next);
        }}
        onBack={() => setView('form')}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-sm text-muted-foreground">첫 단계 · 사업의 핵심 정보</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">내 사업 이해하기</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground" data-testid="prototype-note">
        {PROTOTYPE_NOTE}
      </p>

      <form className="mt-8 space-y-4 rounded-xl border border-border p-4" onSubmit={onStartPlan} data-testid="plan-intake">
        <h2 className="text-lg font-medium">사업계획서로 시작</h2>
        <p className="text-sm text-muted-foreground">
          문서 문장과 창업자 답변, 테스트 픽스처를 구분한다. 테스트 문장은 실제 매출이나 유료 고객이 아니다.
        </p>
        <label htmlFor="plan-text" className="text-sm font-medium">
          사업계획서 발췌
        </label>
        <Textarea
          id="plan-text"
          data-testid="plan-text"
          value={planText}
          onChange={(event) => setPlanText(event.target.value)}
        />
        <label htmlFor="plan-source" className="text-sm font-medium">
          출처
        </label>
        <Input
          id="plan-source"
          data-testid="plan-source"
          value={planSource}
          onChange={(event) => setPlanSource(event.target.value)}
        />
        <label htmlFor="plan-provenance" className="text-sm font-medium">
          문장 구분
        </label>
        <select
          id="plan-provenance"
          data-testid="plan-provenance"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={planProvenance}
          onChange={(event) => setPlanProvenance(event.target.value as AnalysisProvenance)}
        >
          <option value="test_fixture">테스트 픽스처</option>
          <option value="user_declared">사용자가 가져온 문서라고 표시</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="load-lmulm"
            onClick={() => {
              setPlanText(LMULM_PLAN_FIXTURE);
              setPlanProvenance('test_fixture');
              setPlanSource('초기창업패키지 사업계획서 발췌');
            }}
          >
            LMULM 테스트 발췌
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="load-ridm"
            onClick={() => {
              setPlanText(RIDM_PLAN_FIXTURE);
              setPlanProvenance('test_fixture');
              setPlanSource('RIDM AI 투자자 사업계획서 발췌');
            }}
          >
            RIDM 테스트 발췌
          </Button>
          <Button type="submit" data-testid="start-plan">
            이 문서로 판단 시작
          </Button>
        </div>
        {planError ? (
          <p className="text-sm" data-testid="plan-error" role="status">
            {planError}
          </p>
        ) : null}
      </form>

      <form className="mt-8 space-y-6" onSubmit={onStart} data-testid="journey-intake">
        <TextField
          id="field-business"
          label="1. 어떤 사업인가요?"
          required
          value={intake.business}
          invalid={missing.includes('business')}
          onChange={(value) => updateIntake('business', value)}
        />
        <TextField
          id="field-customer"
          label="2. 주요 고객은 누구인가요?"
          required
          value={intake.customer}
          invalid={missing.includes('customer')}
          onChange={(value) => updateIntake('customer', value)}
        />
        <TextField
          id="field-problem"
          label="3. 고객의 어떤 문제를 해결하나요?"
          required
          multiline
          value={intake.problem}
          invalid={missing.includes('problem')}
          onChange={(value) => updateIntake('problem', value)}
        />
        <TextField
          id="field-solution"
          label="4. 어떤 해결책을 제공하나요?"
          value={intake.solution}
          onChange={(value) => updateIntake('solution', value)}
        />

        <RadioGroup
          name="payer"
          legend="5. 누가 비용을 지불하나요?"
          value={intake.payer}
          options={PAYER_OPTIONS}
          onChange={(value) => updateIntake('payer', value as PayerChoice)}
        />
        <RadioGroup
          name="revenue"
          legend="6. 수익 방식은 무엇인가요?"
          value={intake.revenue}
          options={REVENUE_OPTIONS}
          onChange={(value) => updateIntake('revenue', value as RevenueChoice)}
        />
        <RadioGroup
          name="evidence"
          legend="7. 현재 확보한 사업 근거는 무엇인가요?"
          value={intake.evidence}
          options={EVIDENCE_OPTIONS}
          onChange={(value) => updateIntake('evidence', value as EvidenceChoice)}
        />

        <div className="space-y-2">
          <label htmlFor="field-url" className="text-sm font-medium">
            8. 참고할 웹페이지 URL (선택)
          </label>
          <Input
            id="field-url"
            data-testid="field-url"
            value={intake.url}
            placeholder="https://"
            onChange={(event) => updateIntake('url', event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            URL이 없어도 시작할 수 있습니다. 페이지를 열지 않으면 조사 미실행으로 표시합니다.
          </p>
        </div>

        {source === 'test_hypothesis' ? (
          <p
            className="rounded-md border border-border px-3 py-2 text-sm"
            data-testid="hypothesis-badge"
          >
            테스트 가설 · 검증된 사업 사실이 아니다
          </p>
        ) : null}

        {missing.length > 0 ? (
          <p className="text-sm text-destructive" data-testid="intake-error" role="alert">
            {missing.map((field) => REQUIRED_LABEL[field]).join(' ')} 비어 있으면 이해를 시작하지 않습니다.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" data-testid="submit-intake">
            이 내용으로 이해 확인
          </Button>
          <Button type="button" variant="outline" data-testid="fill-hypothesis" onClick={fillHypothesis}>
            테스트 가설 채우기
          </Button>
        </div>
      </form>
    </div>
  );
}

function HandoffPanel({
  journey,
  onJourneyChange,
}: {
  journey: JourneyState;
  onJourneyChange: (state: JourneyState) => void;
}) {
  const [preparedAt, setPreparedAt] = useState(() => new Date().toISOString());
  const [paste, setPaste] = useState('');
  const [message, setMessage] = useState('');
  const [provenance, setProvenance] = useState<'test_fixture' | 'user_declared'>('test_fixture');
  const [evidenceKind, setEvidenceKind] = useState<'model_claim' | 'order_record' | 'interview_verbatim' | 'unknown'>('model_claim');
  const [sourceLabel, setSourceLabel] = useState('test_fixture');
  const [missing, setMissing] = useState<string[]>([]);
  const prepared = prepareAnalysisRequest(journey, preparedAt);
  const next = nextHandoffInput(journey);

  function onKeep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = acceptPastedAnalysis(journey, {
      executionId: prepared.executionId,
      text: paste,
      providerLabel: sourceLabel,
      provenance,
      evidenceKind,
      sourceLabel,
      citedExcerpt: evidenceKind === 'order_record' || evidenceKind === 'interview_verbatim' ? paste : null,
      now: new Date().toISOString(),
    });
    setMessage(result.reason);
    setMissing(result.missing);
    if (!result.accepted) return;
    onJourneyChange(result.state);
    setPaste('');
    setPreparedAt(new Date().toISOString());
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyHandoffKept, {
      screen: '/business-validation',
      status: 'research_not_run',
      question_id: result.state.externalNotes?.at(-1)?.questionId ?? undefined,
      category: provenance,
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-border p-4" data-testid="handoff-panel">
      <h2 className="text-sm font-medium">사용자가 직접 옮기는 분석 요청</h2>
      <p className="text-sm text-muted-foreground">
        ALABOM은 이 문장을 모델 API나 AI 웹 화면에 보내지 않는다. 사용자가 자기 브라우저에서 실행하고, 결과 문장을 붙여 넣는다.
        붙여넣은 문장은 참고이며 검증된 사실이 아니다.
      </p>
      <p className="text-sm" data-testid="handoff-execution-id">
        실행 ID {prepared.executionId}
      </p>
      <Textarea readOnly value={prepared.prompt} data-testid="handoff-prompt" rows={8} />
      <form className="space-y-3" onSubmit={onKeep}>
        <label className="block text-sm" htmlFor="handoff-provenance">
          문장 구분
          <select
            id="handoff-provenance"
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            data-testid="handoff-provenance"
            value={provenance}
            onChange={(event) => setProvenance(event.target.value as 'test_fixture' | 'user_declared')}
          >
            <option value="test_fixture">테스트 문장</option>
            <option value="user_declared">사용자가 가져온 응답이라고 표시</option>
          </select>
        </label>
        <label className="block text-sm" htmlFor="handoff-evidence-kind">
          근거 종류
          <select
            id="handoff-evidence-kind"
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            data-testid="handoff-evidence-kind"
            value={evidenceKind}
            onChange={(event) =>
              setEvidenceKind(event.target.value as 'model_claim' | 'order_record' | 'interview_verbatim' | 'unknown')
            }
          >
            <option value="model_claim">모델 주장</option>
            <option value="order_record">발주 기록이라고 표시한 발췌</option>
            <option value="interview_verbatim">인터뷰 원문이라고 표시한 발췌</option>
            <option value="unknown">출처 성격을 모름</option>
          </select>
        </label>
        <label className="block text-sm" htmlFor="handoff-source">
          출처 표시
          <Input
            id="handoff-source"
            data-testid="handoff-source"
            value={sourceLabel}
            onChange={(event) => setSourceLabel(event.target.value)}
          />
        </label>
        <p className="text-sm text-muted-foreground">
          사용자가 실제 응답이라고 표시해도 ALABOM이 모델 호출로 확인하지 않으면 실분석 성공으로 세지 않는다.
        </p>
        <Textarea
          value={paste}
          data-testid="handoff-paste"
          rows={4}
          placeholder="AI 화면에서 직접 복사한 문장"
          onChange={(event) => setPaste(event.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="outline" data-testid="submit-handoff">
            참고 자료로 보관
          </Button>
          <Button type="button" variant="ghost" data-testid="refresh-handoff" onClick={() => setPreparedAt(new Date().toISOString())}>
            요청 다시 준비
          </Button>
        </div>
        {missing.length > 0 ? (
          <p className="text-sm text-destructive" data-testid="handoff-missing" role="alert">
            빠진 항목: {missing.join(', ')}. 이전 판단을 유지한다.
          </p>
        ) : null}
        {message ? (
          <p className="text-sm" data-testid="handoff-message" role="status">
            {message}
          </p>
        ) : null}
      </form>
      <ul className="space-y-2 text-sm" data-testid="handoff-records">
        {(journey.externalNotes ?? []).map((note) => (
          <li key={note.executionId} data-testid={`handoff-record-${note.executionId}`}>
            {note.executionId} {note.provenance === 'user_declared' ? '사용자 표시: 실제 응답이라고 함' : '테스트 문장'}. 시스템 확인: {note.systemVerified ? '함' : '하지 않음'}. {note.claimStatus}. 사실 아님. 실분석 성공 아님. {note.text}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground" data-testid="handoff-next">
        {next.prompt}
      </p>
    </section>
  );
}

function UnderstandingView({
  journey,
  choiceId,
  freeText,
  answerMessage,
  customerDraft,
  correctionMessage,
  onChoice,
  onFreeText,
  onAnswer,
  onCustomerDraft,
  onCorrect,
  onJourneyChange,
  onBack,
}: {
  journey: JourneyState;
  choiceId: string;
  freeText: string;
  answerMessage: string;
  customerDraft: string;
  correctionMessage: string;
  onChoice: (value: string) => void;
  onFreeText: (value: string) => void;
  onAnswer: (event: React.FormEvent<HTMLFormElement>) => void;
  onCustomerDraft: (value: string) => void;
  onCorrect: (event: React.FormEvent<HTMLFormElement>) => void;
  onJourneyChange: (state: JourneyState) => void;
  onBack: () => void;
}) {
  const question = journey.nextQuestion;
  const verification = verificationActionFor(journey);
  const citationTrace = liveCitationTrace();
  const crossReview = citationTrace.review;
  const execution = liveScreenStatus(journey);
  const stateContract = screenStateContract(journey);
  const [sourceText, setSourceText] = useState('');
  const [sourceHypotheses, setSourceHypotheses] = useState<string[]>([]);
  const [sourceNote, setSourceNote] = useState('');
  const [sourceMissing, setSourceMissing] = useState<string[]>([]);
  const [counterText, setCounterText] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const decision = decisionSnapshot(journey);

  function onToggleHypothesis(id: string) {
    setSourceHypotheses((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function onAttachSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = sourceText.trim();
    const result = attachFounderSource(journey, {
      text,
      hypothesisIds: sourceHypotheses,
      causeId: text ? `cause-${sourceHash(text)}` : '',
      now: new Date().toISOString(),
    });
    setSourceMissing(result.missing);
    setSourceNote(result.reason);
    if (result.transitionRan) {
      onJourneyChange(result.state);
      setSourceText('');
      setSourceHypotheses([]);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-10" data-testid="understanding">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">현재 AI가 이해한 사업</p>
        <h1 className="text-3xl font-semibold tracking-tight">잠정 이해</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <StatusBadge testId="badge-research">
            {executionBadgeLabel('research', journey.researchStatus)}
          </StatusBadge>
          <StatusBadge testId="badge-counter-review">
            {executionBadgeLabel('counterReview', journey.counterReviewStatus)}
          </StatusBadge>
          <StatusBadge testId="badge-judgment">
            {executionBadgeLabel('judgment', journey.judgmentStatus)}
          </StatusBadge>
        </div>
        {journey.source === 'test_hypothesis' ? (
          <p className="text-sm" data-testid="hypothesis-badge">
            테스트 가설 · 검증된 사업 사실이 아니다
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground" data-testid="session-note">
          {journey.sessionNote}
        </p>
      </header>

      <section className="space-y-3" data-testid="known-list">
        <h2 className="text-lg font-medium">알고 있는 것</h2>
        <ul className="space-y-2 text-sm leading-relaxed">
          {journey.understanding.known.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" data-testid="inferred-list">
        <h2 className="text-lg font-medium">추정한 것</h2>
        {journey.understanding.inferred.map((item) => (
          <p key={item.id} className="text-sm leading-relaxed">
            {item.text}
          </p>
        ))}
        <p className="text-sm text-muted-foreground" data-testid="provisional-note">
          {PROVISIONAL_NOTE}
        </p>
      </section>

      <section className="space-y-3" data-testid="contradiction-list">
        <h2 className="text-lg font-medium">서로 모순되는 것</h2>
        {journey.understanding.contradictions.length === 0 ? (
          <p className="text-sm text-muted-foreground">지금 입력 안에서 충돌은 없다.</p>
        ) : (
          <ul className="space-y-2 text-sm leading-relaxed">
            {journey.understanding.contradictions.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" data-testid="unknown-list">
        <h2 className="text-lg font-medium">아직 확인되지 않은 부분</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {journey.understanding.unknown.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4" data-testid="judgment-panel">
        <h2 className="text-lg font-medium">사업성 판단</h2>
        <p className="text-sm leading-relaxed" data-testid="judgment-text">
          {journey.judgmentText}
        </p>
        {decision ? (
          <div className="space-y-2 text-sm" data-testid="decision-panel">
            <p data-testid="plan-badge">{decision.fixtureLabel}</p>
            <p data-testid="decision-stage">현재 단계: {decision.stage}</p>
            <p data-testid="decision-support">핵심 근거: {decision.support.join(' ')}</p>
            <p data-testid="decision-counter">반대·공백: {decision.counter.join(' ')}</p>
            <p data-testid="decision-unresolved">결정적 미확인: {decision.unresolved.join(', ')}</p>
            <p data-testid="decision-next">다음 검증: {decision.nextAction}</p>
            <p data-testid="decision-exit">종료 조건: {decision.exitCondition}</p>
            <ul data-testid="plan-claims">
              {journey.planCase?.claims.map((item) => (
                <li key={item.id}>
                  {item.role}: {item.text} 출처 {item.sourceLabel}. {item.claimStatus}. 원장 검증 {item.ledgerChecked ? '됨' : '아님'}.
                </li>
              ))}
            </ul>
            <ul data-testid="fixture-results">
              {decision.fixtureResults.map((item) => (
                <li key={item.id}>
                  {item.label}. {item.note}
                </li>
              ))}
            </ul>
            {closeNote ? (
              <p data-testid="close-blockers" role="status">
                {closeNote}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                data-testid="close-attempt"
                onClick={() => {
                  const blocked = blockersToClose(journey);
                  setCloseNote(`${blocked.reason} ${blocked.unresolved.join(', ')}`);
                  void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.missingDataClicked, {
                    screen: '/business-validation',
                    status: 'research_not_run',
                    question_id: 'close_attempt',
                  });
                }}
              >
                검증 없이 판단 마치기
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="attach-fixture"
                onClick={() => {
                  onJourneyChange(withFixtureResult(journey, '재구매율 18%라고 적은 테스트 문장', new Date().toISOString()));
                }}
              >
                테스트 픽스처 결과 연결
              </Button>
            </div>
          </div>
        ) : null}
        <ul className="space-y-3 text-sm" data-testid="judgment-comparisons">
          {(journey.judgmentComparisons ?? []).map((item) => (
            <li key={item.id} data-testid={`comparison-${item.id}`}>
              <p>이전 판단: {item.previousJudgmentText}</p>
              <p>이후 판단: {item.nextJudgmentText}</p>
              <p>
                {item.judgmentChanged ? '판단 문장이 바뀌었다.' : '판단 문장은 바뀌지 않았다.'} {item.reason}
              </p>
              <p>
                가설 {item.affectedHypothesisIds.join(', ') || '없음'} · 근거 {item.evidenceIds.join(', ') || '없음'} · 실행 {item.executionId ?? '없음'}
              </p>
              <p>
                {item.provenance === 'user_declared' ? '사용자 표시: 실제 응답이라고 함' : item.provenance === 'test_fixture' ? '테스트 문장' : '분석 문장 아님'}
                . 시스템 확인: {item.systemVerified ? '함' : '하지 않음'}. 실분석 성공 {item.realAnalysisSuccess ? '예' : '아니오'}. 검증된 사실 아님.
              </p>
              <p>
                개선 평가: {item.improvementAssessed ? '함' : '하지 않음'}. 근거와 가설의 연결 검토: {item.linkJustified ? '정당함' : '하지 않음'}.
                {(item.missing ?? []).length > 0 ? ` 빠진 항목: ${(item.missing ?? []).join(', ')}.` : ''}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{journey.judgmentHoldReason}</p>
        <p className="text-sm" data-testid="research-note">
          {journey.researchNote}
        </p>
        <p className="text-sm" data-testid="counter-review-note">
          {journey.counterReviewNote}
        </p>
        <p className="text-sm" data-testid="cross-review-status">
          교차 검토 {crossReview.outcome}. {crossReview.reason}
        </p>
        <p className="text-sm" data-testid="citation-check">
          출처 대조{' '}
          {citationTrace.citations
            .map((item) => `${item.side === 'gemini' ? 'Gemini' : 'GPT'} ${sourceCheckLabel(item.sourceCheck)}`)
            .join(', ')}
          . {citationTrace.reason}
        </p>
        <p className="text-sm" data-testid="analysis-acceptance">
          {acceptanceSummary(journey.analysisAcceptances)}
        </p>
        <p className="text-sm" data-testid="execution-state">
          실행 상태 {execution.researchStatus}, {execution.counterReviewStatus}, {execution.comparison}. 분석 완료로
          표시하지 않는다.
        </p>
        <ul className="space-y-1 text-sm" data-testid="state-contract">
          <li data-testid="state-research">조사 실행 {stateContract.research}</li>
          <li data-testid="state-counter">반대 검토 {stateContract.counterReview}</li>
          <li data-testid="state-acceptance">
            분석 수용 {stateContract.acceptance === 'acceptance_absent' ? '기록 없음' : stateContract.acceptance}
          </li>
          <li data-testid="state-citation">
            인용 검증 대조 불가. 비교 {stateContract.comparison}. 비교할 실제 분석 결과가 없다.
          </li>
          <li data-testid="state-judgment">사업 판단 {stateContract.judgment}. supported는 사업성 검증이 아니다.</li>
          <li data-testid="state-ledger">{LEDGER_SCREEN_EMPTY}</li>
        </ul>
        {journey.redelivery ? (
          <div className="space-y-2 text-sm" data-testid="redelivery-note">
            <p>{journey.redelivery.reason}</p>
            <p>
              {journey.redelivery.inputReady
                ? '관련 맥락은 갖췄다.'
                : '관련 맥락이 부족하거나 재조사를 열지 않아 모델 입력을 만들지 않는다.'}{' '}
              모델에는 보내지 않았다.
            </p>
            <ul data-testid="redelivery-items">
              {(journey.redelivery.items ?? [])
                .filter((item) => item.disposition === 'included')
                .map((item) => (
                  <li key={item.id}>
                    {contextRoleLabel(item.role)}: {item.reason}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
        <p className="text-sm leading-relaxed" data-testid="verification-action">
          검증 행동: {verification.action}
        </p>
        <p className="text-sm text-muted-foreground" data-testid="evidence-needed">
          필요한 증거: {verification.evidenceNeeded}
        </p>
        <form className="space-y-3 border-t border-border pt-3" onSubmit={onAttachSource} data-testid="source-form">
          <h3 className="text-base font-medium">원문 붙이기</h3>
          <p className="text-sm text-muted-foreground">
            붙여 넣은 문장은 창업자 원문이다. 닿는 가설만 재평가하고, 사업 전체의 결론은 확정하지 않는다.
          </p>
          <Textarea
            id="source-text"
            data-testid="source-text"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
          />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">이 원문이 닿는 가설</legend>
            {SOURCE_HYPOTHESES.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sourceHypotheses.includes(item.id)}
                  data-testid={`source-hypothesis-${item.id}`}
                  onChange={() => onToggleHypothesis(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
          {sourceMissing.length > 0 ? (
            <p className="text-sm text-destructive" data-testid="source-missing" role="alert">
              빠진 항목: {sourceMissing.join(', ')}. 판단 문장은 바꾸지 않는다.
            </p>
          ) : null}
          {sourceNote ? (
            <p className="text-sm" data-testid="source-note" role="status">
              {sourceNote}
            </p>
          ) : null}
          <Button type="submit" variant="outline" data-testid="submit-source">
            이 원문을 가설에 연결
          </Button>
        </form>
        <ul className="space-y-2 text-sm" data-testid="hypothesis-judgments">
          {(journey.hypothesisJudgments ?? []).map((item) => (
            <li key={item.hypothesisId} data-testid={`hypothesis-judgment-${item.hypothesisId}`}>
              {item.hypothesisId} · {item.stance} · 원인 {item.causeId} · {item.after} · 미검증{' '}
              {item.notEstablished.join(', ')}
            </li>
          ))}
        </ul>
        <ul className="space-y-2 text-sm" data-testid="source-records">
          {(journey.sourceRecords ?? []).map((record) => (
            <li key={record.id}>
              <p>
                원문 {record.id} · 원인 {record.causeId} · {record.receivedAt}
              </p>
              <p>{record.excerpt}</p>
              <p>
                가설 {record.hypothesisIds.join(', ')} · {record.claimLabel}
              </p>
              <p data-testid={`source-effect-${record.id}`}>효과 {record.effect ?? 'unchanged'}</p>
              <p>사업 판단 이전: {record.previousJudgmentText}</p>
              <p>사업 판단 이후: {record.nextJudgmentText}</p>
              <p>가설 판단 이전: {record.hypothesisBefore}</p>
              <p>가설 판단 이후: {record.hypothesisAfter}</p>
              <p>미검증: {(record.notEstablished ?? []).join(', ')}</p>
              <p>{record.reason}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm" data-testid="next-action">
          다음 행동: {journey.nextAction.text}
        </p>
        <p className="text-sm text-muted-foreground">성공 기준: {journey.nextAction.successCriterion}</p>
        <p className="text-sm text-muted-foreground">실패 기준: {journey.nextAction.failureCriterion}</p>
      </section>

      {question ? (
        <>
        <HandoffPanel journey={journey} onJourneyChange={onJourneyChange} />
        <form className="space-y-4" onSubmit={onAnswer} data-testid="question-form">
          <h2 className="text-lg font-medium">다음으로 가장 중요한 질문</h2>
          <p className="text-base leading-relaxed" data-testid="question-prompt">
            {question.prompt}
          </p>
          {question.whyDifferent ? (
            <p className="text-sm text-muted-foreground" data-testid="question-why">
              {question.whyDifferent}
            </p>
          ) : null}
          {question.purpose ? (
            <p className="text-sm" data-testid="question-purpose">
              질문 목적: {question.purpose}
            </p>
          ) : null}
          {question.answerBranches ? (
            <p className="text-sm" data-testid="question-branches">
              답에 따른 분기: {question.answerBranches}
            </p>
          ) : null}
          {question.unchangedWhen ? (
            <p className="text-sm" data-testid="question-unchanged">
              판단이 바뀌지 않는 조건: {question.unchangedWhen}
            </p>
          ) : null}
          <fieldset className="space-y-2">
            <legend className="sr-only">{question.prompt}</legend>
            {question.choices.map((choice) => (
              <label key={choice.id} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="journey-choice"
                  className="mt-1"
                  value={choice.id}
                  checked={choiceId === choice.id}
                  data-testid={`choice-${choice.id}`}
                  onChange={() => onChoice(choice.id)}
                  required
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-2">
            <label htmlFor="free-text" className="text-sm font-medium">
              구체적인 내용이나 근거 (선택)
            </label>
            <Textarea
              id="free-text"
              data-testid="free-text"
              value={freeText}
              onChange={(event) => onFreeText(event.target.value)}
            />
          </div>
          {answerMessage ? (
            <p className="text-sm" data-testid="answer-note" role="status">
              {answerMessage}
            </p>
          ) : null}
          <Button type="submit" data-testid="submit-answer">
            이 답변으로 이해 갱신
          </Button>
        </form>
        </>
      ) : (
        <p className="text-sm" data-testid="question-hold">
          더 물을 질문이 없다. 판단은 유보로 남아 있다.
        </p>
      )}

      <form
        className="space-y-3 border-t border-border pt-6"
        data-testid="counter-form"
        onSubmit={(event) => {
          event.preventDefault();
          const result = recordCounterClaim(journey, counterText, new Date().toISOString());
          setCounterNote(result.reason);
          if (result.applied) {
            onJourneyChange(result.state);
            setCounterText('');
          }
        }}
      >
        <h2 className="text-lg font-medium">기존 주장과 모순되는 근거</h2>
        <Textarea
          id="counter-text"
          data-testid="counter-text"
          value={counterText}
          onChange={(event) => setCounterText(event.target.value)}
        />
        {counterNote ? (
          <p className="text-sm" data-testid="counter-note" role="status">
            {counterNote}
          </p>
        ) : null}
        <Button type="submit" variant="outline" data-testid="submit-counter">
          반대 근거 남기기
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="replay-last-answer"
          onClick={() => {
            const last = journey.answers.at(-1);
            if (!last) {
              setCounterNote('다시 넣을 답변이 없다.');
              return;
            }
            const result = replayStoredAnswer(journey, last.id);
            setCounterNote(result.reason);
          }}
        >
          같은 답변 다시 넣기
        </Button>
      </form>

      <form className="space-y-3 border-t border-border pt-6" onSubmit={onCorrect}>
        <h2 className="text-lg font-medium">목표 고객 진술 수정</h2>
        <label htmlFor="correct-customer" className="text-sm font-medium">
          고객을 다르게 말하면 이전 문장도 남깁니다.
        </label>
        <Input
          id="correct-customer"
          data-testid="correct-customer"
          value={customerDraft}
          onChange={(event) => onCustomerDraft(event.target.value)}
        />
        {correctionMessage ? (
          <p className="text-sm" data-testid="correction-note" role="status">
            {correctionMessage}
          </p>
        ) : null}
        <Button type="submit" variant="outline" data-testid="submit-correction">
          이 진술을 수정
        </Button>
      </form>

      <details className="text-sm" data-testid="answer-history">
        <summary>답변 원문</summary>
        {journey.answers.length === 0 && journey.revisions.length === 0 ? (
          <p className="mt-2 text-muted-foreground">아직 기록된 답이 없다.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {journey.answers.map((answer) => (
              <li key={answer.id}>
                <p>{answer.questionText}</p>
                <p>
                  {answer.choiceLabel}
                  {answer.freeText ? ` / ${answer.freeText}` : ''}
                </p>
                <p data-testid={`grade-${answer.id}`}>{answer.claimLabel}</p>
              </li>
            ))}
            {journey.revisions.map((revision) => (
              <li key={revision.id}>
                <p>
                  이전: {revision.previous || '없음'} / 이후: {revision.next}
                </p>
                <p>{revision.material ? '가설 변경' : '같은 진술'}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-muted-foreground">모델 원문 없음. 호출하지 않았다.</p>
      </details>

      {journey.repeatBlockedReason ? (
        <p className="text-sm" data-testid="repeat-blocked">
          {journey.repeatBlockedReason}
        </p>
      ) : null}

      <Button type="button" variant="ghost" data-testid="back-to-intake" onClick={onBack}>
        입력으로 돌아가기
      </Button>
    </div>
  );
}

function StatusBadge({ children, testId }: { children: string; testId: string }) {
  return (
    <span className="rounded-full border border-border px-3 py-1" data-testid={testId}>
      {children}
    </span>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  required,
  invalid,
  multiline,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {multiline ? (
        <Textarea
          id={id}
          data-testid={id}
          value={value}
          required={required}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          data-testid={id}
          value={value}
          required={required}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function RadioGroup({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name={name}
            className="mt-1"
            value={option.id}
            checked={value === option.id}
            data-testid={`${name}-${option.id}`}
            onChange={() => onChange(option.id)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
