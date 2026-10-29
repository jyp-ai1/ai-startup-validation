'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import { businessBodyForReviewMatch, stripReviewIntakeLines } from '@/lib/project/parse-intake-seed';
import type { AiPmReviewView } from '../lib/ai-pm-review';
import {
  REVIEW_FOCUS_PRESETS,
  REVIEW_PURPOSE_LABEL,
  REVIEW_PURPOSES,
  REVIEW_STAGE_LABEL,
  REVIEW_STAGES,
  composeReviewInput,
  isCurrentReviewContract,
  isReviewStage,
  nextDirectionAfterChoice,
  type ReviewPurpose,
  type ReviewStage,
} from '../lib/ai-pm-review-intake';
import {
  REVIEW_MARK_LABEL,
  REVIEW_MARKS,
  inputFingerprint,
  readingFromInput,
  readingFromSections,
  restoredMarks,
  reviseReading,
  visibleClaimStates,
  type ReviewMark,
} from '../lib/ai-pm-review-marks';
import type { BusinessAnalysis, ChoiceAnswer } from '../lib/ai-pm-review-store';

type LoadResponse = {
  error?: string;
  reused?: boolean;
  review?: AiPmReviewView | null;
  reviews?: AiPmReviewView[];
  storage?: { durable?: boolean };
};

type Step = 'result' | 'feedback' | 'revised' | 'question' | 'reflected';

type AiPmReviewPanelProps = {
  initialText?: string;
  projectId?: string;
};

const LOCAL_PREFIX = 'll-ai-pm-marks:';
const CHOICE_PREFIX = 'll-ai-pm-choice:';

export function AiPmReviewPanel({ initialText = '', projectId = '' }: AiPmReviewPanelProps) {
  const [text, setText] = useState(initialText);
  const [purpose, setPurpose] = useState<ReviewPurpose | ''>('');
  const [stage, setStage] = useState<ReviewStage | ''>('');
  const [focusPreset, setFocusPreset] = useState('');
  const [focusText, setFocusText] = useState('');
  const [reviews, setReviews] = useState<AiPmReviewView[]>([]);
  const [auth, setAuth] = useState<'unknown' | 'in' | 'out'>('unknown');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>('result');
  const [marks, setMarks] = useState<ReviewMark[]>([]);
  const [marksTouched, setMarksTouched] = useState(false);
  const [answer, setAnswer] = useState('');
  const [founderFact, setFounderFact] = useState('');
  const [savedWhere, setSavedWhere] = useState<'account' | 'browser' | ''>('');
  const [choiceId, setChoiceId] = useState('');
  const [otherText, setOtherText] = useState('');
  const [savedChoice, setSavedChoice] = useState<ChoiceAnswer | null>(null);
  const restoredKey = useRef('');

  const active = useMemo(() => matchReview(reviews, text, projectId), [reviews, text, projectId]);
  const analysis = active?.sections?.analysis ?? null;
  const accountRestored = useMemo(() => restoredMarks(active?.feedback ?? [], null), [active]);
  const viewMarks = marksTouched || marks.length > 0 ? marks : accountRestored.marks;
  const viewWhere = marksTouched || marks.length > 0 ? savedWhere : savedWhere || accountRestored.where;
  const reading = active?.sections ? readingFromSections(active.sections) : readingFromInput(stripReviewIntakeLines(text));
  const revised = reviseReading(reading, viewMarks, founderFact);
  const revisionReview = useMemo(() => {
    const needle = businessBodyForReviewMatch(text);
    return (
      reviews
        .filter(
          (review) =>
            review.projectId === projectId &&
            review.revision &&
            (!needle || businessBodyForReviewMatch(review.inputText) === needle),
        )
        .at(-1) ?? null
    );
  }, [reviews, text, projectId]);
  const revisionForText =
    revisionReview?.revision && (!active || revisionReview.finishedAt >= active.finishedAt)
      ? revisionReview.revision
      : null;
  const claimRows = active?.sections && !analysis ? visibleClaimStates(active.sections) : null;
  const reconfirmReading = Boolean(claimRows?.some((row) => row.state === 'unconfirmed'));
  const focus = focusPreset === 'direct' ? focusText : focusPreset;
  const accountChoice = useMemo(() => latestChoice(active), [active]);

  useEffect(() => {
    setText((current) => (current.trim() ? current : initialText));
  }, [initialText]);

  useEffect(() => {
    void loadReviews();
  }, [projectId]);

  useEffect(() => {
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmSingleFlowViewed, {
      screen: '/business-validation',
      status: 'viewed',
      category: 'single-flow',
    });
  }, []);

  useEffect(() => {
    const latestFeedback = active?.feedback?.at(-1)?.feedbackId ?? 'none';
    const key = `${active?.reviewId ?? 'none'}:${latestFeedback}:${text}`;
    if (restoredKey.current === key) return;
    restoredKey.current = key;
    const restored = restoredMarks(active?.feedback ?? [], readLocal(text));
    if (restored.marks.length > 0 || restored.fact) {
      setMarks(restored.marks);
      if (restored.fact) setFounderFact(restored.fact);
      if (restored.where) setSavedWhere(restored.where);
      if (restored.where === 'account') {
        setMessage('저장된 피드백을 다시 열었습니다. 모델 호출은 없습니다.');
        void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmReviewReopened, {
          screen: '/business-validation',
          status: 'stored',
          category: 'saved-marks',
        });
      }
    }
    const choice = accountChoice ?? readStoredChoice(active?.reviewId ?? '');
    setSavedChoice(choice);
    if (choice) {
      setChoiceId(choice.choiceId);
      setOtherText(choice.otherText);
      setMessage('저장한 답을 다시 열었습니다. 모델 호출은 없습니다.');
    }
  }, [active, text, accountChoice]);

  useEffect(() => {
    if (!revisionForText) return;
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmRevisionViewed, {
      screen: '/business-validation',
      status: revisionForText.pass ? 'pass' : 'blocked',
      category: 'revision-gate',
    });
  }, [revisionForText]);

  async function loadReviews() {
    if (!projectId) {
      setAuth('in');
      setReviews([]);
      return;
    }
    const response = await fetch(`/api/ai-pm-review?projectId=${encodeURIComponent(projectId)}`);
    const body = (await response.json()) as LoadResponse;
    if (response.status === 401) {
      setAuth('out');
      setReviews([]);
      return;
    }
    setAuth('in');
    setReviews(body.reviews ?? []);
  }

  async function startReview() {
    const body = stripReviewIntakeLines(text);
    const selectedPurpose = purpose || 'overall';
    if (pending || !projectId || body.trim().length < 8) return;
    setPending(true);
    setMessage('');
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmReviewRequested, {
      screen: '/business-validation',
      status: 'requested',
      category: selectedPurpose,
    });
    try {
      const form = new FormData();
      form.set('projectId', projectId);
      form.set(
        'text',
        composeReviewInput({
          text: body,
          purpose: selectedPurpose,
          stage: stage || null,
          focus,
        }),
      );
      const response = await fetch('/api/ai-pm-review', { method: 'POST', body: form });
      const payload = (await response.json()) as LoadResponse;
      if (response.status === 401) {
        setAuth('out');
        setMessage('로그인 후 모델 검토를 이 계정에 저장할 수 있습니다.');
        return;
      }
      if (!response.ok || !payload.review) {
        setMessage(inputError(payload.error));
        return;
      }
      remember(payload.review);
      setStep('result');
      setMarks([]);
      setMarksTouched(true);
      setFounderFact('');
      setSavedWhere('');
      setChoiceId('');
      setOtherText('');
      setSavedChoice(latestChoice(payload.review));
      setMessage(
        payload.review.sections?.analysis
          ? payload.reused
            ? '저장된 사업성 검토를 다시 열었습니다.'
            : '사업성 검토를 저장했습니다. 아래에서 질문 하나를 골라 주세요.'
          : statusLine(payload.review),
      );
      void recordFunnelEvent(
        payload.reused ? PRODUCT_ANALYTICS_EVENTS.aiPmReviewReopened : PRODUCT_ANALYTICS_EVENTS.aiPmReviewRequested,
        {
          screen: '/business-validation',
          status: payload.review.status,
          category: payload.reused ? 'reused' : 'first',
        },
      );
    } catch {
      setMessage('검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.');
    } finally {
      setPending(false);
    }
  }

  async function submitFeedback() {
    const selected = viewMarks;
    if (pending || selected.length === 0) return;
    setPending(true);
    setMessage('');
    try {
      let where: 'account' | 'browser' = 'browser';
      if (active && auth === 'in') {
        const response = await fetch('/api/ai-pm-review/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, reviewId: active.reviewId, marks: selected }),
        });
        const body = (await response.json()) as LoadResponse;
        if (response.ok && body.review) {
          remember(body.review);
          where = 'account';
        } else if (response.status !== 401) {
          setMessage('피드백을 저장하지 못했습니다. 선택 항목을 확인해 주세요.');
          return;
        } else {
          setAuth('out');
        }
      }
      if (where === 'browser') {
        writeLocal(text, selected, founderFact);
        setMessage('이 브라우저에 저장했습니다. 계정에는 저장되지 않았습니다.');
      } else {
        setMessage('이 검토 버전에 저장했습니다. 모델 호출은 없습니다.');
      }
      setMarks(selected);
      setMarksTouched(true);
      setSavedWhere(where);
      setStep('revised');
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmFeedbackStored, {
        screen: '/business-validation',
        status: 'stored',
        category: selected[0],
      });
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmRevisionViewed, {
        screen: '/business-validation',
        status: 'revised',
        category: where,
      });
    } catch {
      setMessage('피드백을 저장하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  async function saveChoice() {
    if (!active?.sections || !analysis || pending) return;
    const selected = analysis.choices.find((choice) => choice.id === choiceId);
    if (!selected) return;
    if (selected.id === 'other' && !otherText.trim()) return;
    const choice: ChoiceAnswer = {
      choiceId: selected.id,
      label: selected.label,
      otherText: selected.id === 'other' ? otherText.trim() : '',
    };
    setPending(true);
    setMessage('');
    try {
      let where: 'account' | 'browser' = 'browser';
      if (auth === 'in') {
        const response = await fetch('/api/ai-pm-review/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            reviewId: active.reviewId,
            choiceId: choice.choiceId,
            choiceLabel: choice.label,
            otherText: choice.otherText,
          }),
        });
        const body = (await response.json()) as LoadResponse;
        if (response.ok && body.review) {
          remember(body.review);
          where = 'account';
        } else if (response.status === 401) {
          setAuth('out');
        } else {
          setMessage('답을 저장하지 못했습니다. 선택 항목을 확인해 주세요.');
          return;
        }
      }
      if (where === 'browser') writeStoredChoice(active.reviewId, choice);
      setSavedChoice(choice);
      setSavedWhere(where);
      setMessage('답을 저장했습니다. 모델 호출은 없습니다.');
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmChoiceSaved, {
        screen: '/business-validation',
        status: 'stored',
        category: choice.choiceId,
      });
    } catch {
      setMessage('답을 저장하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  function remember(review: AiPmReviewView) {
    setReviews((current) => [...current.filter((item) => item.reviewId !== review.reviewId), review]);
    if (review.inputText) setText(review.inputText);
  }

  function toggleMark(mark: ReviewMark) {
    setMarksTouched(true);
    setMarks((current) => {
      const base = current.length > 0 ? current : viewMarks;
      return base.includes(mark) ? base.filter((item) => item !== mark) : [...base, mark];
    });
  }

  function reflectLocalAnswer() {
    const fact = answer.trim();
    if (!fact) return;
    setFounderFact(fact);
    setMarks(viewMarks);
    setMarksTouched(true);
    writeLocal(text, viewMarks, fact);
    setSavedWhere('browser');
    setStep('reflected');
    setMessage('이 답을 다음 검증 정리에 반영했습니다. 모델 호출은 없습니다.');
  }

  const needsModelCall = auth === 'in' && !analysis;
  const showIntake = !analysis;

  return (
    <section
      className="space-y-5 rounded-2xl border border-border bg-card px-5 py-5 sm:px-7"
      data-testid="ai-pm-review"
      data-result-source={analysis ? 'model-review' : 'input-only'}
      data-step={step}
    >
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-primary">AI PM · 1차 사업성 검토</p>
        <p className="text-sm text-muted-foreground" data-testid="ai-pm-source">
          {analysis ? '이 사업 원문으로 작성한 검토' : '사업 원문 · 검토 전'}
        </p>
        <h2 className="text-lg font-semibold">
          {analysis ? (savedChoice ? '저장한 답과 다음 방향' : '1차 사업성 검토') : '사업 정보'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {analysis
            ? savedChoice
              ? '확인된 답은 이 워크스페이스에 남습니다. 후속 모델 검토는 실행하지 않습니다.'
              : '분석을 읽은 뒤, 가장 큰 불확실성 하나를 고르면 답이 저장됩니다.'
            : '사업 본문과 검토 목적을 보내면 분석과 질문 하나를 받습니다. 단계와 알고 싶은 내용은 비워도 됩니다.'}
        </p>
      </header>

      {message ? (
        <p className="text-sm" data-testid="ai-pm-message" role="status">
          {message}
        </p>
      ) : null}

      {pending ? (
        <p className="text-sm" data-testid="ai-pm-loading">
          {analysis ? '답을 저장하고 있습니다. 모델 호출은 없습니다.' : '사업 원문으로 종합 사업성 검토를 읽고 있습니다.'}
        </p>
      ) : null}

      {revisionForText && !analysis ? (
        <p className="text-sm" data-testid="ai-pm-revision-gate">
          {revisionForText.summary}
        </p>
      ) : null}

      {active?.status === 'failed' && !analysis ? (
        <p className="text-sm">검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.</p>
      ) : null}

      {step === 'result' ? (
        <div className="space-y-4" data-testid="ai-pm-result">
          {showIntake ? (
            <IntakeFields
              text={stripReviewIntakeLines(text)}
              purpose={purpose}
              stage={stage}
              focusPreset={focusPreset}
              focusText={focusText}
              onText={setText}
              onPurpose={setPurpose}
              onStage={setStage}
              onFocusPreset={setFocusPreset}
              onFocusText={setFocusText}
            />
          ) : null}
          {viewMarks.length > 0 && !analysis ? <SavedRevision notes={revised.notes} where={viewWhere} /> : null}
          {!analysis && reading.summary ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">입력한 사업</p>
              <p data-testid="ai-pm-summary">{reading.summary}</p>
              {reading.openingTrimmed ? (
                <p className="text-xs text-muted-foreground">앞부분만 표시합니다. 같은 원문을 다른 카드에 반복하지 않습니다.</p>
              ) : null}
            </div>
          ) : null}
          {analysis && active?.sections ? (
            <>
              <p data-testid="ai-pm-next-question-text" className="sr-only">
                {active.sections.nextQuestion}
              </p>
              <AnalysisBlock
                analysis={analysis}
                sections={active.sections}
                saved={savedChoice}
                choiceId={choiceId}
                otherText={otherText}
                pending={pending}
                onChoice={setChoiceId}
                onOther={setOtherText}
                onSave={() => void saveChoice()}
              />
            </>
          ) : active?.sections && !needsModelCall ? (
            <div className="space-y-3" data-testid="ai-pm-core">
              <p className="text-sm font-medium">{reconfirmReading ? '재확인할 해석' : '현재 확인된 핵심'}</p>
              {claimRows ? (
                <ul className="space-y-2" data-testid="ai-pm-claim-states">
                  {claimRows.map((row) => (
                    <li key={row.field} data-testid={`ai-pm-claim-${row.field}`}>
                      <span className="font-medium">{row.label}. </span>
                      <span data-testid={`ai-pm-claim-state-${row.field}`}>{row.stateLabel}</span>{' '}
                      <span>{row.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p>
                <span className="font-medium">사업 아이디어. </span>
                <span data-testid="ai-pm-idea">{active.sections.execution}</span>
              </p>
              <p>
                <span className="font-medium">가장 큰 미확인 가설. </span>
                <span data-testid="ai-pm-hypothesis">{active.sections.uncertain[0]}</span>
              </p>
              <p className="text-xs text-muted-foreground">미확인 가설은 확인된 사실이 아닙니다.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="ai-pm-core">
              사업 내용만 입력해도 종합 사업성 검토를 시작합니다. 목적과 단계는 고르지 않아도 됩니다.
            </p>
          )}
          {analysis ? null : needsModelCall ? (
            <Button
              type="button"
              data-testid="ai-pm-submit"
              disabled={pending || !projectId || stripReviewIntakeLines(text).trim().length < 8}
              onClick={() => void startReview()}
            >
              AI 사업성 검토
            </Button>
          ) : (
            <Button
              type="button"
              data-testid="ai-pm-confirm-result"
              disabled={pending || auth === 'unknown' || !reading.summary}
              onClick={() => setStep('feedback')}
            >
              이 결과 확인
            </Button>
          )}
        </div>
      ) : null}

      {step === 'feedback' ? (
        <form
          className="space-y-3"
          data-testid="ai-pm-feedback"
          onSubmit={(event) => {
            event.preventDefault();
            void submitFeedback();
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">검토 결과에 피드백하기</legend>
            <p className="text-xs text-muted-foreground">복수 선택 가능</p>
            {REVIEW_MARKS.map((mark) => (
              <label key={mark} className="block text-sm">
                <input
                  type="checkbox"
                  name="ai-pm-mark"
                  value={mark}
                  checked={viewMarks.includes(mark)}
                  onChange={() => toggleMark(mark)}
                />{' '}
                {REVIEW_MARK_LABEL[mark]}
              </label>
            ))}
          </fieldset>
          <Button type="submit" data-testid="ai-pm-feedback-submit" disabled={pending || viewMarks.length === 0}>
            피드백 저장
          </Button>
        </form>
      ) : null}

      {step === 'revised' || step === 'reflected' ? (
        <div className="space-y-3" data-testid="ai-pm-revised">
          <p className="text-sm font-medium">수정된 판단</p>
          {revised.notes.map((note) => (
            <p key={note} className="text-sm">
              {note}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">
            {viewWhere === 'account' ? '계정에 저장된 선택입니다.' : '이 브라우저에 남은 선택입니다.'}
          </p>
          <p data-testid="ai-pm-summary">{revised.summary}</p>
          {revised.showIdea ? <p data-testid="ai-pm-idea">{revised.idea}</p> : null}
          {revised.hypothesis ? <p data-testid="ai-pm-hypothesis">{revised.hypothesis}</p> : null}
          {revised.founderFact ? <p data-testid="ai-pm-reflected-answer">{revised.founderFact}</p> : null}
          {step === 'revised' ? (
            <Button type="button" data-testid="ai-pm-next-step" disabled={pending} onClick={() => setStep('question')}>
              다음 검증
            </Button>
          ) : null}
        </div>
      ) : null}

      {step === 'question' ? (
        <form
          className="space-y-3"
          data-testid="ai-pm-next-question"
          data-question-source="input-only"
          onSubmit={(event) => {
            event.preventDefault();
            reflectLocalAnswer();
          }}
        >
          <p className="text-sm font-medium">다음에 확인할 질문</p>
          <p data-testid="ai-pm-next-question-text">{revised.question}</p>
          <p data-testid="ai-pm-next-question-reason">{revised.questionReason}</p>
          <Textarea
            data-testid="ai-pm-verification-answer"
            rows={3}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="확인된 사실만 적습니다. 계획이면 계획이라고 적습니다."
          />
          <Button type="submit" data-testid="ai-pm-verification-submit" disabled={pending || !answer.trim()}>
            이 답을 정리에 반영
          </Button>
        </form>
      ) : null}
    </section>
  );
}

function IntakeFields(props: {
  text: string;
  purpose: ReviewPurpose | '';
  stage: ReviewStage | '';
  focusPreset: string;
  focusText: string;
  onText: (value: string) => void;
  onPurpose: (value: ReviewPurpose) => void;
  onStage: (value: ReviewStage | '') => void;
  onFocusPreset: (value: string) => void;
  onFocusText: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">사업 본문</span>
        <Textarea
          data-testid="ai-pm-text"
          rows={5}
          value={props.text}
          onChange={(event) => props.onText(event.target.value)}
          placeholder="사업 내용을 입력합니다."
        />
      </label>
      <fieldset className="space-y-2" data-testid="ai-pm-purpose">
        <legend className="text-sm font-medium">
          사업성 검토 목적 <span className="text-xs font-normal text-muted-foreground">선택</span>
        </legend>
        <p className="text-xs text-muted-foreground">고르지 않으면 종합 사업성 검토로 진행합니다.</p>
        {REVIEW_PURPOSES.map((item) => (
          <label key={item} className="block text-sm">
            <input
              type="radio"
              name="ai-pm-purpose"
              value={item}
              checked={props.purpose === item}
              onChange={() => props.onPurpose(item)}
            />{' '}
            {REVIEW_PURPOSE_LABEL[item]}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">현재 진행 단계</span>
        <span className="ml-2 text-xs text-muted-foreground">선택</span>
        <select
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"
          data-testid="ai-pm-stage"
          value={props.stage}
          onChange={(event) => props.onStage(isReviewStage(event.target.value) ? event.target.value : '')}
        >
          <option value="">선택하지 않음</option>
          {REVIEW_STAGES.map((item) => (
            <option key={item} value={item}>
              {REVIEW_STAGE_LABEL[item]}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          가장 알고 싶은 것 <span className="text-xs font-normal text-muted-foreground">선택</span>
        </legend>
        {REVIEW_FOCUS_PRESETS.map((item) => (
          <label key={item} className="block text-sm">
            <input
              type="radio"
              name="ai-pm-focus"
              value={item}
              checked={props.focusPreset === item}
              onChange={() => props.onFocusPreset(item)}
            />{' '}
            {item}
          </label>
        ))}
        <label className="block text-sm">
          <input
            type="radio"
            name="ai-pm-focus"
            value="direct"
            checked={props.focusPreset === 'direct'}
            onChange={() => props.onFocusPreset('direct')}
          />{' '}
          직접 입력
        </label>
        {props.focusPreset === 'direct' ? (
          <Textarea
            data-testid="ai-pm-focus"
            rows={2}
            value={props.focusText}
            onChange={(event) => props.onFocusText(event.target.value)}
            placeholder="알고 싶은 내용을 적습니다."
          />
        ) : null}
      </fieldset>
    </div>
  );
}

function AnalysisBlock(props: {
  analysis: BusinessAnalysis;
  sections: NonNullable<AiPmReviewView['sections']>;
  saved: ChoiceAnswer | null;
  choiceId: string;
  otherText: string;
  pending: boolean;
  onChoice: (id: string) => void;
  onOther: (value: string) => void;
  onSave: () => void;
}) {
  const { analysis, sections } = props;
  const direction = props.saved
    ? nextDirectionAfterChoice({
        label: props.saved.label,
        otherText: props.saved.otherText,
        reason: sections.nextQuestionReason,
      })
    : '';
  const selected = analysis.choices.find((choice) => choice.id === props.choiceId) ?? null;
  const selectedText =
    selected?.id === 'other' ? props.otherText.trim() || selected.label : (selected?.label ?? '');
  const selectionChanged =
    Boolean(selected) &&
    (!props.saved || props.saved.choiceId !== selected?.id || (selected?.id === 'other' && props.otherText.trim() !== props.saved.otherText));
  return (
    <div className="space-y-4" data-testid="ai-pm-core">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">사업 요약</p>
        <p data-testid="ai-pm-summary">{analysis.summary}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">예비 사업성 판단</p>
        <p data-testid="ai-pm-judgment">{analysis.judgmentDetail}</p>
      </div>
      <StringList title="핵심 가정과 미확인 사항" items={analysis.assumptions} />
      {analysis.nextVerification ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">다음 검증 행동</p>
          <p data-testid="ai-pm-next-verification">{analysis.nextVerification}</p>
        </div>
      ) : null}
      <div className="space-y-2 border-t border-border pt-3 text-sm">
        <p className="font-medium">세부 분석</p>
        <Fact label="핵심 고객" value={sections.customer} />
        <Fact label="해결하려는 문제" value={sections.problem} />
        <Fact label="기존 대안" value={analysis.alternatives ?? ''} />
        <Fact label="제공 가치" value={analysis.value} />
        <Fact label="차별화" value={analysis.differentiation ?? ''} />
        <Fact label="운영 방식" value={analysis.operatingModel} />
        <Fact label="이용자와 지불자" value={analysis.payer} />
        <Fact label="수익 구조" value={sections.revenueModel} />
        <Fact label="시장성" value={sections.market} />
        <Fact label="경쟁" value={analysis.competition} />
        <Fact label="실행 가능성" value={analysis.operations} />
        <Fact label="수익성" value={analysis.profitability} />
        <StringList title="강점" items={analysis.strengths} />
        <StringList title="주요 위험" items={sections.risks} />
        <StringList title="판단을 바꿀 증거" items={analysis.evidenceToChange} />
        <StringList title="입력에서 읽은 사실" items={analysis.founderFacts} />
        <StringList title="추론" items={analysis.inferences} />
        <p className="text-xs text-muted-foreground">원문에 없는 가격, 수수료, 시장 수치는 확정된 사실이 아닙니다.</p>
      </div>
      <form
        className="space-y-3"
        data-testid="ai-pm-next-question"
        data-question-source="model-review"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSave();
        }}
      >
        <p className="text-sm font-medium">첫 객관식 피드백</p>
        <p className="text-xs text-muted-foreground">
          이 선택은 확인된 사실이 아닙니다. 현재 판단으로 저장하면 다음 검토 방향을 안내합니다. 후속 모델 검토는 실행하지
          않습니다.
        </p>
        <p>{sections.nextQuestion}</p>
        <p data-testid="ai-pm-next-question-reason">{sections.nextQuestionReason}</p>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">하나를 고르거나 직접 적습니다</legend>
          {analysis.choices.map((choice) => (
            <label key={choice.id} className="block text-sm">
              <input
                type="radio"
                name="ai-pm-choice"
                value={choice.id}
                checked={props.choiceId === choice.id}
                onChange={() => props.onChoice(choice.id)}
              />{' '}
              {choice.label}
            </label>
          ))}
        </fieldset>
        {props.choiceId === 'other' ? (
          <Textarea
            data-testid="ai-pm-choice-other"
            rows={3}
            value={props.otherText}
            onChange={(event) => props.onOther(event.target.value)}
            placeholder="기타 / 직접 입력"
          />
        ) : null}
        {selectionChanged ? (
          <p className="text-sm" data-testid="ai-pm-choice-preview">
            저장할 답: {selectedText}
          </p>
        ) : null}
        <Button
          type="submit"
          data-testid="ai-pm-choice-submit"
          disabled={props.pending || !props.choiceId || (props.choiceId === 'other' && !props.otherText.trim())}
        >
          이 답 저장
        </Button>
      </form>
      {props.saved ? (
        <div className="space-y-2" data-testid="ai-pm-choice-saved">
          <p className="text-sm font-medium">저장한 답</p>
          <p>{props.saved.otherText || props.saved.label}</p>
          <p className="text-sm" data-testid="ai-pm-next-direction">
            {direction}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-medium">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StringList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{title}</p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SavedRevision({ notes, where }: { notes: string[]; where: 'account' | 'browser' | '' }) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="ai-pm-revised">
      <p className="text-sm font-medium">수정된 판단</p>
      {notes.map((note) => (
        <p key={note} className="text-sm">
          {note}
        </p>
      ))}
      <p className="text-xs text-muted-foreground">
        {where === 'account' ? '계정에 저장된 선택입니다.' : '이 브라우저에 남은 선택입니다.'}
      </p>
    </div>
  );
}

function matchReview(reviews: AiPmReviewView[], text: string, projectId: string): AiPmReviewView | null {
  if (!projectId) return null;
  const ready = reviews.filter(
    (review) =>
      review.projectId === projectId &&
      review.status === 'ready' &&
      review.sections &&
      review.questionSource === 'model-review',
  );
  const needle = businessBodyForReviewMatch(text);
  const matched = needle ? ready.filter((review) => businessBodyForReviewMatch(review.inputText) === needle) : ready;
  const analyzed = matched.filter(
    (review) => review.sections?.analysis && isCurrentReviewContract(review.inputText),
  );
  return analyzed.at(-1) ?? null;
}

function latestChoice(review: AiPmReviewView | null): ChoiceAnswer | null {
  const found = [...(review?.feedback ?? [])].reverse().find((item) => item.choiceAnswer);
  return found?.choiceAnswer ?? null;
}

function readLocal(text: string): { marks: ReviewMark[]; fact: string } | null {
  if (typeof window === 'undefined' || !text.trim()) return null;
  try {
    const raw = sessionStorage.getItem(`${LOCAL_PREFIX}${inputFingerprint(text)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { marks?: unknown; fact?: unknown };
    const marks = Array.isArray(parsed.marks)
      ? parsed.marks.filter((item): item is ReviewMark => REVIEW_MARKS.includes(item as ReviewMark))
      : [];
    return { marks, fact: typeof parsed.fact === 'string' ? parsed.fact : '' };
  } catch {
    return null;
  }
}

function writeLocal(text: string, marks: ReviewMark[], fact: string) {
  if (typeof window === 'undefined' || !text.trim()) return;
  sessionStorage.setItem(`${LOCAL_PREFIX}${inputFingerprint(text)}`, JSON.stringify({ marks, fact }));
}

function readStoredChoice(reviewId: string): ChoiceAnswer | null {
  if (typeof window === 'undefined' || !reviewId) return null;
  try {
    const raw = sessionStorage.getItem(`${CHOICE_PREFIX}${reviewId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChoiceAnswer>;
    if (!parsed.choiceId || !parsed.label) return null;
    return { choiceId: parsed.choiceId, label: parsed.label, otherText: parsed.otherText ?? '' };
  } catch {
    return null;
  }
}

function writeStoredChoice(reviewId: string, choice: ChoiceAnswer) {
  if (typeof window === 'undefined' || !reviewId) return;
  sessionStorage.setItem(`${CHOICE_PREFIX}${reviewId}`, JSON.stringify(choice));
}

function statusLine(review: AiPmReviewView): string {
  if (review.status === 'ready') return '모델 검토를 저장했습니다.';
  if (review.status === 'unavailable') return '지금은 모델 검토 결과를 만들지 못했습니다. 입력은 여기에 남아 있습니다.';
  return '검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.';
}

function inputError(error?: string): string {
  if (error === 'empty') return '사업 내용을 입력해 주세요.';
  if (error === 'too_long' || error === 'file_too_large') return '사업 내용이 너무 깁니다. 핵심 부분만 남겨 주세요.';
  if (error === 'unsupported' || error === 'unreadable_file') return '내용을 직접 입력해 주세요.';
  if (error === 'storage_unavailable') return '저장소에 연결하지 못했습니다. 검토 결과는 만들지 않았습니다.';
  return '검토를 시작하지 못했습니다.';
}
