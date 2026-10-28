'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import type { AiPmReviewView } from '../lib/ai-pm-review';
import {
  REVIEW_MARK_LABEL,
  REVIEW_MARKS,
  inputFingerprint,
  readingFromInput,
  readingFromSections,
  restoredMarks,
  reviseReading,
  type ReviewMark,
} from '../lib/ai-pm-review-marks';

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
};

const LOCAL_PREFIX = 'll-ai-pm-marks:';

export function AiPmReviewPanel({ initialText = '' }: AiPmReviewPanelProps) {
  const [text, setText] = useState(initialText);
  const [reviews, setReviews] = useState<AiPmReviewView[]>([]);
  const [auth, setAuth] = useState<'unknown' | 'in' | 'out'>('unknown');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>('result');
  const [marks, setMarks] = useState<ReviewMark[]>([]);
  const [answer, setAnswer] = useState('');
  const [founderFact, setFounderFact] = useState('');
  const [savedWhere, setSavedWhere] = useState<'account' | 'browser' | ''>('');
  const restoredKey = useRef('');

  const active = useMemo(() => matchReview(reviews, text), [reviews, text]);
  const reading = active?.sections ? readingFromSections(active.sections) : readingFromInput(text);
  const revised = reviseReading(reading, marks, founderFact);
  const modelQuestion = Boolean(active?.questionSource === 'model-review' && !marks.includes('question_unfit'));

  useEffect(() => {
    setText((current) => (current.trim() ? current : initialText));
  }, [initialText]);

  useEffect(() => {
    void loadReviews();
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmSingleFlowViewed, {
      screen: '/business-validation',
      status: 'viewed',
      category: 'single-flow',
    });
  }, []);

  useEffect(() => {
    const key = `${active?.reviewId ?? 'none'}:${text}`;
    if (restoredKey.current === key) return;
    restoredKey.current = key;
    const restored = restoredMarks(active?.feedback ?? [], readLocal(text));
    if (restored.marks.length === 0 && !restored.fact) return;
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
  }, [active, text]);

  async function loadReviews() {
    const response = await fetch('/api/ai-pm-review');
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
    if (pending || text.trim().length < 8) return;
    setPending(true);
    setMessage('');
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmReviewRequested, {
      screen: '/business-validation',
      status: 'requested',
      category: 'first',
    });
    try {
      const form = new FormData();
      form.set('text', text);
      const response = await fetch('/api/ai-pm-review', { method: 'POST', body: form });
      const body = (await response.json()) as LoadResponse;
      if (response.status === 401) {
        setAuth('out');
        setMessage('로그인 후 모델 검토를 이 계정에 저장할 수 있습니다.');
        return;
      }
      if (!response.ok || !body.review) {
        setMessage(inputError(body.error));
        return;
      }
      remember(body.review);
      setStep('result');
      setMarks([]);
      setFounderFact('');
      setSavedWhere('');
      setMessage(body.reused ? '저장된 검토를 다시 열었습니다.' : statusLine(body.review));
      void recordFunnelEvent(
        body.reused ? PRODUCT_ANALYTICS_EVENTS.aiPmReviewReopened : PRODUCT_ANALYTICS_EVENTS.aiPmReviewRequested,
        {
          screen: '/business-validation',
          status: body.review.status,
          category: body.reused ? 'reused' : 'first',
        },
      );
    } catch {
      setMessage('검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.');
    } finally {
      setPending(false);
    }
  }

  async function submitFeedback() {
    if (pending || marks.length === 0) return;
    setPending(true);
    setMessage('');
    try {
      let where: 'account' | 'browser' = 'browser';
      if (active && auth === 'in') {
        const response = await fetch('/api/ai-pm-review/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId: active.reviewId, marks }),
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
        writeLocal(text, marks, founderFact);
        setMessage('이 브라우저에 저장했습니다. 계정에는 저장되지 않았습니다.');
      } else {
        setMessage('이 검토 버전에 저장했습니다. 모델 호출은 없습니다.');
      }
      setSavedWhere(where);
      setStep('revised');
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmFeedbackStored, {
        screen: '/business-validation',
        status: 'stored',
        category: marks[0],
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

  async function followUp() {
    if (!active || pending || !answer.trim()) return;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/ai-pm-review/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: active.reviewId, supplement: answer.trim() }),
      });
      const body = (await response.json()) as LoadResponse;
      if (!response.ok || !body.review) {
        setMessage(
          body.error === 'feedback_required'
            ? '피드백을 저장한 뒤 추가 검증을 진행합니다.'
            : '추가 검증 결과를 만들지 못했습니다.',
        );
        return;
      }
      remember(body.review);
      setMarks([]);
      setFounderFact('');
      setAnswer('');
      setStep('result');
      setMessage(body.reused ? '저장된 추가 검증을 다시 열었습니다.' : '추가 검증 결과를 저장했습니다.');
    } catch {
      setMessage('추가 검증이 끝나기 전에 실패했습니다.');
    } finally {
      setPending(false);
    }
  }

  function remember(review: AiPmReviewView) {
    setReviews((current) => [...current.filter((item) => item.reviewId !== review.reviewId), review]);
    if (review.inputText) setText(review.inputText);
  }

  function toggleMark(mark: ReviewMark) {
    setMarks((current) => (current.includes(mark) ? current.filter((item) => item !== mark) : [...current, mark]));
  }

  function reflectLocalAnswer() {
    const fact = answer.trim();
    if (!fact) return;
    setFounderFact(fact);
    writeLocal(text, marks, fact);
    setSavedWhere('browser');
    setStep('reflected');
    setMessage('이 답을 다음 검증 정리에 반영했습니다. 모델 호출은 없습니다.');
  }

  const needsModelCall = auth === 'in' && !active;
  const showComposer = !initialText.trim() && !active;

  return (
    <section
      className="space-y-5 rounded-2xl border border-border bg-card px-5 py-5 sm:px-7"
      data-testid="ai-pm-review"
      data-result-source={active ? 'model-review' : 'input-only'}
      data-step={step}
    >
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-primary">AI PM · 1차 사업 검토</p>
        <p className="text-sm text-muted-foreground" data-testid="ai-pm-source">
          {active ? '모델이 작성한 검토' : '입력 원문 · 모델 검토 전'}
        </p>
        <h2 className="text-lg font-semibold">{active ? '가설 검증 필요' : '모델 검토 전'}</h2>
      </header>

      {message ? (
        <p className="text-sm" data-testid="ai-pm-message" role="status">
          {message}
        </p>
      ) : null}

      {active?.status === 'failed' ? (
        <p className="text-sm">검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.</p>
      ) : null}

      {step === 'result' ? (
        <div className="space-y-4" data-testid="ai-pm-result">
          {showComposer ? (
            <Textarea
              data-testid="ai-pm-text"
              rows={5}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="사업 내용을 입력합니다."
            />
          ) : null}
          {marks.length > 0 ? <SavedRevision notes={revised.notes} where={savedWhere} /> : null}
          {reading.summary ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">한 줄 요약</p>
              <p data-testid="ai-pm-summary">{reading.summary}</p>
              {reading.openingTrimmed ? (
                <p className="text-xs text-muted-foreground">앞부분만 표시합니다. 같은 원문을 다른 카드에 반복하지 않습니다.</p>
              ) : null}
            </div>
          ) : null}
          {active?.sections ? (
            <div className="space-y-3" data-testid="ai-pm-core">
              <p className="text-sm font-medium">현재 확인된 핵심</p>
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
              모델 검토 전에는 미확인 가설을 만들지 않습니다.
            </p>
          )}
          {needsModelCall ? (
            <Button type="button" data-testid="ai-pm-submit" disabled={pending || text.trim().length < 8} onClick={() => void startReview()}>
              AI PM 1차 검토
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
                  checked={marks.includes(mark)}
                  onChange={() => toggleMark(mark)}
                />{' '}
                {REVIEW_MARK_LABEL[mark]}
              </label>
            ))}
          </fieldset>
          <Button type="submit" data-testid="ai-pm-feedback-submit" disabled={pending || marks.length === 0}>
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
            {savedWhere === 'account' ? '계정에 저장된 선택입니다.' : '이 브라우저에 남은 선택입니다.'}
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
        modelQuestion && active?.sections ? (
          <form
            className="space-y-3"
            data-testid="ai-pm-next-question"
            data-question-source="model-review"
            onSubmit={(event) => {
              event.preventDefault();
              void followUp();
            }}
          >
            <p className="text-sm font-medium">다음에 확인할 질문</p>
            <p data-testid="ai-pm-next-question-text">{active.sections.nextQuestion}</p>
            <p data-testid="ai-pm-next-question-reason">{active.sections.nextQuestionReason}</p>
            <Textarea
              data-testid="ai-pm-verification-answer"
              rows={3}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={active.sections.answerHint}
            />
            <Button type="submit" data-testid="ai-pm-verification-submit" disabled={pending || !answer.trim()}>
              이 답으로 다음 검증
            </Button>
          </form>
        ) : (
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
        )
      ) : null}
    </section>
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

function matchReview(reviews: AiPmReviewView[], text: string): AiPmReviewView | null {
  const ready = reviews.filter((review) => review.status === 'ready' && review.sections && review.questionSource === 'model-review');
  const needle = text.replace(/\s+/g, ' ').trim();
  if (!needle) return ready.at(-1) ?? null;
  return ready.filter((review) => review.inputText.replace(/\s+/g, ' ').trim() === needle).at(-1) ?? null;
}

function readLocal(text: string): { marks: ReviewMark[]; fact: string } | null {
  if (typeof window === 'undefined' || !text.trim()) return null;
  try {
    const raw = sessionStorage.getItem(`${LOCAL_PREFIX}${inputFingerprint(text)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { marks?: unknown; fact?: unknown };
    const marks = Array.isArray(parsed.marks) ? parsed.marks.filter((item): item is ReviewMark => REVIEW_MARKS.includes(item as ReviewMark)) : [];
    return { marks, fact: typeof parsed.fact === 'string' ? parsed.fact : '' };
  } catch {
    return null;
  }
}

function writeLocal(text: string, marks: ReviewMark[], fact: string) {
  if (typeof window === 'undefined' || !text.trim()) return;
  sessionStorage.setItem(`${LOCAL_PREFIX}${inputFingerprint(text)}`, JSON.stringify({ marks, fact }));
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
