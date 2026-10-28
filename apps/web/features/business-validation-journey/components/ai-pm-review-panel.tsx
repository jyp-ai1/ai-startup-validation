'use client';

import { useEffect, useState } from 'react';

import { Button, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import type { AiPmReviewView } from '../lib/ai-pm-review';
import type { Accuracy, Agreement, NextAction, RevisionArea } from '../lib/ai-pm-review-store';

type LoadResponse = {
  error?: string;
  reused?: boolean;
  review?: AiPmReviewView | null;
  reviews?: AiPmReviewView[];
  storage?: { durable?: boolean };
};

const AGREEMENT: Array<{ value: Agreement; label: string }> = [
  { value: 'agree', label: '동의함 — 현재 판단이 적절함' },
  { value: 'partial', label: '일부 동의 — 보완이 필요함' },
  { value: 'disagree', label: '동의하지 않음 — 판단을 재검토해야 함' },
  { value: 'need_info', label: '판단하기 어려움 — 정보가 더 필요함' },
];

const ACCURACY: Array<{ value: Accuracy; label: string }> = [
  { value: 'very_accurate', label: '매우 정확함' },
  { value: 'mostly_accurate', label: '대체로 정확하지만 일부 누락됨' },
  { value: 'misstated', label: '중요한 사실이나 맥락이 잘못 반영됨' },
  { value: 'hard_to_compare', label: '실제 상황과 비교하기 어려움' },
];

const AREAS: Array<{ value: RevisionArea; label: string }> = [
  { value: 'payer', label: '목표 고객 또는 실제 결제 고객' },
  { value: 'problem', label: '고객 문제와 해결책' },
  { value: 'market', label: '시장 규모와 수요 근거' },
  { value: 'revenue', label: '수익모델과 가격·수익성' },
  { value: 'execution', label: '실행 가능성과 운영 계획' },
  { value: 'competition', label: '경쟁사와 차별화' },
  { value: 'risk', label: '위험 요소와 실패 가능성' },
  { value: 'evidence', label: '근거 부족 또는 사실과 추정의 혼동' },
  { value: 'other', label: '기타' },
];

const NEXT: Array<{ value: NextAction; label: string }> = [
  { value: 'verify_hypotheses', label: '부족한 정보와 핵심 가설 추가 검증' },
  { value: 'revise_plan', label: '사업계획 및 사업모델 수정' },
  { value: 'design_interviews', label: '잠재 고객 인터뷰·수요 검증 설계' },
  { value: 'proceed', label: '현재 계획으로 다음 단계 진행' },
  { value: 'hold', label: '사업 아이디어 보류 또는 중단 검토' },
];

type AiPmReviewPanelProps = {
  initialText?: string;
};

const SECTION_LABEL = {
  customer: '핵심 고객',
  problem: '해결할 문제',
  market: '검증 지표',
  revenueModel: '수익 가설',
  execution: '제안하는 해결책',
} as const;

export function AiPmReviewPanel({ initialText = '' }: AiPmReviewPanelProps) {
  const [text, setText] = useState(initialText);
  const [file, setFile] = useState<File | null>(null);
  const [reviews, setReviews] = useState<AiPmReviewView[]>([]);
  const [activeId, setActiveId] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [agreement, setAgreement] = useState<Agreement | ''>('');
  const [accuracy, setAccuracy] = useState<Accuracy | ''>('');
  const [areas, setAreas] = useState<RevisionArea[]>([]);
  const [comment, setComment] = useState('');
  const [nextAction, setNextAction] = useState<NextAction | ''>('');
  const [supplement, setSupplement] = useState('');
  const [verificationAnswer, setVerificationAnswer] = useState('');

  const active = reviews.find((review) => review.reviewId === activeId) ?? reviews.at(-1) ?? null;

  useEffect(() => {
    void loadReviews();
  }, []);

  useEffect(() => {
    setText((current) => (current.trim() ? current : initialText));
  }, [initialText]);

  async function loadReviews() {
    const response = await fetch('/api/ai-pm-review');
    const body = (await response.json()) as LoadResponse;
    if (response.status === 401) {
      setMessage('로그인 후 AI PM 검토를 저장할 수 있습니다.');
      return;
    }
    const next = body.reviews ?? [];
    setReviews(next);
    const latest = [...next].reverse().find((review) => review.status === 'ready') ?? next.at(-1);
    if (latest) setActiveId(latest.reviewId);
  }

  async function startReview() {
    if (pending) return;
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
      if (file) form.set('file', file);
      const response = await fetch('/api/ai-pm-review', { method: 'POST', body: form });
      const body = (await response.json()) as LoadResponse;
      if (response.status === 401) {
        setMessage('로그인 후 AI PM 검토를 저장할 수 있습니다.');
        return;
      }
      if (!response.ok || !body.review) {
        setMessage(inputError(body.error));
        return;
      }
      remember(body.review);
      setMessage(body.reused ? '저장된 검토를 다시 열었습니다.' : statusLine(body.review, body.storage?.durable === true));
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
    if (!active || pending) return;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/ai-pm-review/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: active.reviewId,
          agreement,
          accuracy,
          revisionAreas: areas,
          comment,
          nextAction,
        }),
      });
      const body = (await response.json()) as LoadResponse;
      if (!response.ok || !body.review) {
        setMessage('피드백을 저장하지 못했습니다. 선택 항목을 확인해 주세요.');
        return;
      }
      remember(body.review);
      setMessage(`${nextStep(nextAction as NextAction)} 피드백은 이 검토 버전에 저장했습니다.`);
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.aiPmFeedbackStored, {
        screen: '/business-validation',
        status: 'stored',
        category: nextAction,
      });
    } catch {
      setMessage('피드백을 저장하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  async function followUp(nextSupplement = supplement) {
    if (!active || pending) return;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/ai-pm-review/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: active.reviewId, supplement: nextSupplement }),
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
      setMessage(body.reused ? '저장된 추가 검증을 다시 열었습니다.' : '추가 검증 결과를 저장했습니다.');
    } catch {
      setMessage('추가 검증이 끝나기 전에 실패했습니다.');
    } finally {
      setPending(false);
    }
  }

  function remember(review: AiPmReviewView) {
    setReviews((current) => {
      const without = current.filter((item) => item.reviewId !== review.reviewId);
      return [...without, review];
    });
    setActiveId(review.reviewId);
    if (review.inputText) setText(review.inputText);
  }

  function toggleArea(area: RevisionArea) {
    setAreas((current) => (current.includes(area) ? current.filter((item) => item !== area) : [...current, area]));
  }

  const savedFeedback = active?.feedback.at(-1);
  const needsFollowUp =
    savedFeedback?.nextAction === 'verify_hypotheses' ||
    savedFeedback?.nextAction === 'revise_plan' ||
    savedFeedback?.nextAction === 'design_interviews';

  return (
    <section className="mt-8 space-y-4 rounded-xl border border-border p-4" data-testid="ai-pm-review">
      <p className="text-sm font-medium">AI PM</p>
      <h2 className="text-lg font-medium">사업 아이디어를 검토하고 다음 실행을 설계합니다.</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>사업계획서 파일을 업로드하거나 사업 내용을 직접 입력합니다.</li>
        <li>AI PM이 고객과 지불자, 문제와 해결책, 시장 근거, 수익모델, 주요 위험을 검토합니다.</li>
        <li>사업성 판단과 근거, 불확실한 정보, 우선 검증할 가설을 확인합니다.</li>
        <li>객관식으로 판단에 동의하는지 평가하고, 부족한 설명은 기타 의견으로 보완합니다.</li>
        <li>피드백을 반영해 필요한 추가 검증과 실행 과제를 결정합니다.</li>
      </ol>

      <label className="block text-sm font-medium" htmlFor="ai-pm-file">
        사업계획서 파일
      </label>
      <input
        id="ai-pm-file"
        data-testid="ai-pm-file"
        type="file"
        accept=".txt,.md,.pdf,.docx,.doc,text/plain,text/markdown,application/pdf"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <label className="block text-sm font-medium" htmlFor="ai-pm-text">
        사업 내용
      </label>
      <Textarea
        id="ai-pm-text"
        data-testid="ai-pm-text"
        rows={8}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="사업 내용을 직접 입력합니다."
      />
      <Button
        type="button"
        data-testid="ai-pm-submit"
        disabled={pending || (!text.trim() && !file)}
        onClick={() => void startReview()}
      >
        AI PM 1차 검토
      </Button>
      {message ? (
        <p className="text-sm" data-testid="ai-pm-message" role="status">
          {message}
        </p>
      ) : null}

      {active?.sections ? (
        <div className="space-y-3 text-sm" data-testid="ai-pm-result">
          <h3 className="font-medium">결론</h3>
          <p data-testid="ai-pm-judgment">{active.sections.judgment}</p>
          <p>
            <span className="font-medium">가장 큰 불확실성. </span>
            {active.sections.uncertain[0]}
          </p>
          <details data-testid="ai-pm-result-details">
            <summary className="cursor-pointer font-medium">상세 근거 보기</summary>
            <div className="mt-3 space-y-3">
              <p className="text-muted-foreground">검토 버전 {active.version}</p>
          {(Object.keys(SECTION_LABEL) as Array<keyof typeof SECTION_LABEL>).map((key) => (
            <p key={key}>
              <span className="font-medium">{SECTION_LABEL[key]}. </span>
              {active.sections?.[key]}
            </p>
          ))}
          <p>
            <span className="font-medium">주요 위험. </span>
            {active.sections.risks.join(' ')}
          </p>
          <p>
            <span className="font-medium">불확실한 정보. </span>
            {active.sections.uncertain.join(' ')}
          </p>
          <p>
            <span className="font-medium">우선 검증할 가설. </span>
            {active.sections.hypotheses.join(' ')}
          </p>
            </div>
          </details>
          {active.questionSource === 'model-review' ? (
            <form
              className="space-y-2 rounded-xl border border-border p-3"
              data-testid="ai-pm-next-question"
              data-question-source="model-review"
              onSubmit={(event) => {
                event.preventDefault();
                if (!verificationAnswer.trim()) return;
                void followUp(verificationAnswer.trim());
              }}
            >
              <p className="font-medium">AI PM 검토가 고른 다음 검증</p>
              <p data-testid="ai-pm-next-question-text">{active.sections.nextQuestion}</p>
              <p data-testid="ai-pm-next-question-reason">{active.sections.nextQuestionReason}</p>
              <Textarea
                data-testid="ai-pm-verification-answer"
                rows={3}
                value={verificationAnswer}
                onChange={(event) => setVerificationAnswer(event.target.value)}
                placeholder={active.sections.answerHint}
              />
              <Button type="submit" data-testid="ai-pm-verification-submit" disabled={pending || !verificationAnswer.trim()}>
                이 답으로 다음 검증
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {active?.status === 'ready' ? (
        <form
          className="space-y-4"
          data-testid="ai-pm-feedback"
          onSubmit={(event) => {
            event.preventDefault();
            void submitFeedback();
          }}
        >
          <h3 className="text-base font-medium">1차 사업성 검토 피드백</h3>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">AI PM의 종합적인 사업성 판단에 동의하시나요?</legend>
            {AGREEMENT.map((option) => (
              <label key={option.value} className="block text-sm">
                <input
                  type="radio"
                  name="ai-pm-agreement"
                  value={option.value}
                  checked={agreement === option.value}
                  onChange={() => setAgreement(option.value)}
                />{' '}
                {option.label}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">검토 내용이 실제 사업 상황을 얼마나 잘 반영했나요?</legend>
            {ACCURACY.map((option) => (
              <label key={option.value} className="block text-sm">
                <input
                  type="radio"
                  name="ai-pm-accuracy"
                  value={option.value}
                  checked={accuracy === option.value}
                  onChange={() => setAccuracy(option.value)}
                />{' '}
                {option.label}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">어떤 부분을 수정하거나 보완해야 하나요?</legend>
            {AREAS.map((option) => (
              <label key={option.value} className="block text-sm">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={areas.includes(option.value)}
                  onChange={() => toggleArea(option.value)}
                />{' '}
                {option.label}
              </label>
            ))}
          </fieldset>
          <label className="block text-sm font-medium" htmlFor="ai-pm-comment">
            기타 의견 및 불충분한 설명 보완
          </label>
          <Textarea
            id="ai-pm-comment"
            data-testid="ai-pm-comment"
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="선택한 항목의 이유, 빠진 사실, 잘못된 가정을 적습니다."
          />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">다음으로 무엇을 진행하고 싶나요?</legend>
            {NEXT.map((option) => (
              <label key={option.value} className="block text-sm">
                <input
                  type="radio"
                  name="ai-pm-next"
                  value={option.value}
                  checked={nextAction === option.value}
                  onChange={() => setNextAction(option.value)}
                />{' '}
                {option.label}
              </label>
            ))}
          </fieldset>
          <Button type="submit" data-testid="ai-pm-feedback-submit" disabled={pending || !agreement || !accuracy || !nextAction}>
            피드백 저장
          </Button>
          {savedFeedback && needsFollowUp ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="ai-pm-supplement">
                추가할 사실
              </label>
              <Textarea
                id="ai-pm-supplement"
                data-testid="ai-pm-supplement"
                rows={3}
                value={supplement}
                onChange={(event) => setSupplement(event.target.value)}
              />
              <Button type="button" data-testid="ai-pm-follow-up" disabled={pending} onClick={() => void followUp()}>
                추가 검증 실행
              </Button>
            </div>
          ) : null}
        </form>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="space-y-2 text-sm" data-testid="ai-pm-history">
          {reviews.map((review) => (
            <li key={review.reviewId}>
              <button type="button" className="underline" onClick={() => setActiveId(review.reviewId)}>
                검토 버전 {review.version}
              </button>
              <span> · {review.status === 'ready' ? '결과 있음' : review.status === 'unavailable' ? '결과 없음' : '실패'} · {review.finishedAt}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function statusLine(review: AiPmReviewView, durable: boolean): string {
  if (review.status === 'ready' && durable) {
    return 'AI PM 1차 사업성 검토를 이 계정에 저장했습니다.';
  }
  if (review.status === 'ready') {
    return 'AI PM 1차 사업성 검토를 이 실행 환경에 저장했습니다. 서버가 바뀌거나 다시 배포되면 이 파일은 남지 않을 수 있습니다.';
  }
  if (review.status === 'unavailable') return '지금은 AI PM 검토 결과를 만들지 못했습니다. 입력은 여기에 남아 있습니다.';
  return '검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.';
}

function inputError(error?: string): string {
  if (error === 'empty') return '사업 내용을 입력하거나 파일을 올려 주세요.';
  if (error === 'too_long' || error === 'file_too_large') return '사업 내용이 너무 깁니다. 핵심 부분만 남겨 주세요.';
  if (error === 'unsupported') return '이 파일 형식은 읽지 못합니다. txt, md, pdf, docx를 사용해 주세요.';
  if (error === 'unreadable_file') return '파일에서 문장을 읽지 못했습니다. 내용을 직접 입력해 주세요.';
  if (error === 'storage_unavailable') return '저장소에 연결하지 못했습니다. 검토 결과는 만들지 않았습니다.';
  return '검토를 시작하지 못했습니다.';
}

function nextStep(action: NextAction): string {
  switch (action) {
    case 'verify_hypotheses':
      return '다음 검증은 부족한 정보와 핵심 가설입니다.';
    case 'revise_plan':
      return '다음 검증은 수정한 사업계획입니다.';
    case 'design_interviews':
      return '다음 검증은 잠재 고객 인터뷰 설계입니다.';
    case 'proceed':
      return '현재 계획으로 다음 단계를 진행합니다. 새 검토는 만들지 않습니다.';
    case 'hold':
      return '보류 검토로 저장했습니다. 새 검토는 만들지 않습니다.';
    default:
      return '피드백을 저장했습니다.';
  }
}
