/**
 * One incremental-reflection call of the frozen product follow-up request.
 * The founder answer in the fixture is synthetic test data.
 * Production builds return immediately. The product second-review route is not called.
 * The decision call q1-incremental-reflection-decision-2026-10-30 stays RECORDED.
 * The unified call q1-incremental-reflection-unified-2026-10-30 stays RECORDED.
 * The relation call q1-incremental-reflection-relation-2026-10-30 stays RECORDED.
 * The meaning call q1-incremental-reflection-meaning-2026-10-30 stays RECORDED.
 * The choice-repair call q1-incremental-reflection-choice-repair-2026-10-30 stays RECORDED.
 * The input-trace call q1-incremental-reflection-input-trace-2026-10-30 stays RECORDED.
 * The review-fields call q1-incremental-reflection-review-fields-2026-10-30 stays RECORDED.
 * The reason-quality call q1-incremental-reflection-reason-quality-2026-10-30 stays RECORDED.
 * The normalize call q1-incremental-reflection-normalize-2026-10-30 stays RECORDED.
 * The question call q1-incremental-reflection-question-2026-10-29 stays RECORDED.
 * The link call q1-incremental-reflection-link-2026-10-29 stays RECORDED.
 * The element call q1-incremental-reflection-element-2026-10-29 stays RECORDED.
 * The preserve call q1-incremental-reflection-preserve-2026-10-29 stays RECORDED.
 * Earlier reflection objects stay under their own run ids.
 * Credentials are not written to the report or the log.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PREVIEW_COMPARE_RUN_ID = 'q1-incremental-reflection-retention-2026-10-30';
export const PREVIEW_COMPARE_PRIOR_RUN_ID = 'q1-incremental-reflection-decision-2026-10-30';
export const PREVIEW_COMPARE_BUCKET = 'ai-pm-quality-compare';
export const PREVIEW_COMPARE_OBJECT = `${PREVIEW_COMPARE_RUN_ID}.json`;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(scriptDir, '..');
const fixturePath = join(webRoot, 'features/business-validation-journey/lib/incremental-reflection-retention-request.json');

export function shouldRunPreviewQualityCompare(env) {
  return env.VERCEL_ENV === 'preview' && Boolean(env.VERCEL_GIT_COMMIT_REF) && env.VERCEL_GIT_COMMIT_REF !== 'main';
}

export function redactComparePayload(value, secrets) {
  let text = JSON.stringify(value);
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 8) text = text.split(secret).join('[redacted]');
  }
  text = text.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]');
  text = text.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-jwt]');
  return JSON.parse(text);
}

function safeLine(text) {
  return String(text)
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}/g, '[redacted]');
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

function supabaseConfig(env) {
  const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key.trim()) return null;
  return { url, key };
}

async function storageFetch(config, path, init = {}) {
  const headers = {
    Authorization: `Bearer ${config.key}`,
    apikey: config.key,
    ...(init.headers ?? {}),
  };
  return fetch(`${config.url}/storage/v1${path}`, { ...init, headers });
}

async function ensureBucket(config) {
  const response = await storageFetch(config, '/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: PREVIEW_COMPARE_BUCKET, name: PREVIEW_COMPARE_BUCKET, public: false }),
  });
  if (response.ok) return;
  const body = await response.text();
  if (!body.includes('BucketAlreadyExists')) throw new Error(`bucket_create_${response.status}`);
}

async function readStored(config) {
  const response = await storageFetch(config, `/object/${PREVIEW_COMPARE_BUCKET}/${PREVIEW_COMPARE_OBJECT}`);
  if (!response.ok) return null;
  return response.json();
}

async function writeStored(config, payload) {
  const secrets = [config.key, process.env.GPT_API_KEY, process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  const body = JSON.stringify(redactComparePayload(payload, secrets));
  const response = await storageFetch(config, `/object/${PREVIEW_COMPARE_BUCKET}/${PREVIEW_COMPARE_OBJECT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body,
  });
  if (!response.ok) throw new Error(`object_write_${response.status}`);
}

function completed(stored) {
  return stored && (stored.status === 'RECORDED' || stored.status === 'failed');
}

function messageContent(request, role) {
  return request.messages.find((message) => message.role === role)?.content ?? '';
}

const REVIEW_KEYS = [
  'inputConsidered',
  'impactAssessment',
  'sufficiencyAssessment',
  'retentionDecision',
  'holdReason',
  'evidenceNeeded',
];
const REVIEW_FIELDS = ['judgment', 'hypotheses', 'nextVerification', 'nextQuestion'];

function compactText(text) {
  return String(text ?? '').replace(/\s+/g, '').trim();
}

function genericHold(text) {
  const folded = compactText(text).replace(/[.]/g, '');
  if (['바꾸지않은이유', '새정보가없어유지', '이전과동일한상태', '이전과동일', '유지'].includes(folded)) return true;
  if (/충분하지|부족|확인된사실이아니|근거가아니|주장|계약서|증빙|예약|입금|인터뷰|기록/.test(folded)) return false;
  return /방향성|추가정보|동일한상태|미확인/.test(folded);
}

function statusRepeat(text) {
  const folded = compactText(text).replace(/[.]/g, '');
  if (!/여전히유효|변화가없다|새로운정보가없|새정보가없|방향성을제공|명확한방향/.test(folded)) return false;
  return !/계획|근거가아니|주장|계약서|수요|고객|인터뷰|관련|부족|충분하지|확인된사실이아니|증빙/.test(folded);
}

/** Repair trigger. The stored score still uses incrementalReflectionErrors. This does not write review sentences. */
export function reviewFieldGaps(raw, userPrompt) {
  let parsed;
  let sent;
  try {
    parsed = JSON.parse(raw);
    sent = JSON.parse(userPrompt);
  } catch {
    return ['follow_up_output_unparsed'];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return ['follow_up_output_unparsed'];
  const supplement = typeof sent.founderSupplement === 'string' ? sent.founderSupplement : '';
  const choice = sent.founderChoice && typeof sent.founderChoice.label === 'string' ? sent.founderChoice.label : '';
  const previous = sent.previousAnalysis && typeof sent.previousAnalysis === 'object' ? sent.previousAnalysis : {};
  const experience = choice.includes('체험') && choice.includes('먼저') && !choice.includes('마케팅을 먼저');
  const errors = [];
  const changes = Array.isArray(parsed.changes) ? parsed.changes : [];
  for (const field of REVIEW_FIELDS) {
    const change = changes.find((item) => item && item.field === field);
    if (!change || typeof change !== 'object') {
      errors.push(`follow_up_output_missing_change:${field}`);
      continue;
    }
    for (const key of REVIEW_KEYS) {
      if (typeof change[key] !== 'string' || !change[key].trim()) errors.push(`review_field_missing:${key}:${field}`);
    }
    const decision = typeof change.decision === 'string' ? change.decision.trim() : '';
    const retention = typeof change.retentionDecision === 'string' ? change.retentionDecision.trim() : '';
    if (retention && decision && retention !== decision) errors.push(`retention_decision_mismatch:${field}`);
    const storedPrevious =
      field === 'hypotheses'
        ? (Array.isArray(previous.hypotheses) ? previous.hypotheses : []).join(' / ')
        : field === 'nextVerification'
          ? previous.analysis && typeof previous.analysis.nextVerification === 'string'
            ? previous.analysis.nextVerification
            : ''
          : field === 'nextQuestion'
            ? typeof previous.nextQuestion === 'string'
              ? previous.nextQuestion
              : ''
            : typeof previous.judgment === 'string'
              ? previous.judgment
              : '';
    if (typeof change.previous === 'string' && change.previous !== storedPrevious) errors.push(`follow_up_output_previous:${field}`);
    const current = typeof change.current === 'string' ? change.current : '';
    const changed = typeof change.previous === 'string' && current !== change.previous;
    if (decision && ((changed && decision !== 'changed') || (!changed && decision !== 'retained' && decision !== 'unresolved'))) {
      errors.push(`decision_mismatch:${field}`);
    }
    if (field !== 'judgment' && field !== 'hypotheses') continue;
    const held = decision === 'retained' || decision === 'unresolved';
    const reason = typeof change.reason === 'string' ? change.reason.trim() : '';
    if (held && reason && !/충분하지|바꾸지 않|확인된 사실이 아니|근거가 아니|부족|확정하지/.test(reason)) {
      errors.push(`reason_insufficient:${field}`);
    }
    if (decision === 'retained' && reason && !/영향|바꾸|유지|유보|판단|가설|미확인/.test(reason)) errors.push(`retention_effect_missing:${field}`);
    if (decision === 'retained' && reason && !/유지|바꾸지|그대로|두지|머문/.test(reason)) errors.push(`retention_hold_missing:${field}`);
    if (decision === 'retained' && reason && !/필요|확인해야|증빙|증거가|계약서/.test(reason)) errors.push(`retention_evidence_missing:${field}`);
    if (held && reason && supplement.trim()) {
      const compactReason = compactText(reason);
      const compactSupplement = compactText(supplement);
      let cites = choice.length >= 4 && compactReason.includes(compactText(choice));
      if (!cites && compactSupplement.length >= 8) {
        for (let index = 0; index + 8 <= compactSupplement.length; index += 1) {
          if (compactReason.includes(compactSupplement.slice(index, index + 8))) {
            cites = true;
            break;
          }
        }
      }
      const reasonMarkers = ['예약 고객', '예약', '가격', '계약', '확정된 양조장', '양조장'].filter(
        (marker) => supplement.includes('없') && supplement.includes(marker),
      );
      if (reasonMarkers.some((marker) => reason.includes(marker))) cites = true;
      if (!cites) errors.push(`retention_input_missing:${field}`);
    }
    if (held && typeof change.holdReason === 'string' && change.holdReason.trim() && genericHold(change.holdReason)) {
      errors.push(`review_hold_generic:holdReason:${field}`);
    }
    if (held && change.sufficiencyAssessment === 'sufficient') errors.push(`sufficiency_conflict:${field}`);
    const evidence = typeof change.evidenceNeeded === 'string' ? change.evidenceNeeded : '';
    if (held && evidence.trim() && !/계약서|증빙|예약|입금|확인|인터뷰|기록/.test(evidence)) {
      errors.push(`retention_evidence_missing:${field}`);
    }
    const input = typeof change.inputConsidered === 'string' ? change.inputConsidered : '';
    if (held && input.trim()) {
      const markers = ['예약 고객', '예약', '가격', '계약', '확정된 양조장', '양조장'].filter(
        (marker) => supplement.includes('없') && supplement.includes(marker),
      );
      const cites =
        (choice.length >= 4 && input.includes(choice)) ||
        (supplement.length >= 8 && input.includes(supplement.slice(0, 8))) ||
        markers.some((marker) => input.includes(marker));
      if (!cites || (markers.length > 0 && !markers.some((marker) => input.includes(marker)))) {
        errors.push(`retention_input_missing:${field}`);
      }
    }
    const assertsClaim = /확정되었|확정했다|계약을 맺|계약했다|확보했다|확보되었/.test(supplement);
    const promoted = (text) =>
      assertsClaim &&
      /확정되었|확정했다|계약을 맺|계약했다|확보했다|확보되었/.test(text) &&
      !/주장|확인된 사실이 아니|증빙이 없|증빙은 없|계약서는 없|검증되지|미확인/.test(text);
    if (promoted(input) || promoted(change.impactAssessment || '') || promoted(change.holdReason || '')) {
      errors.push(`claim_promoted_to_fact:${field}`);
    }
    if (held && statusRepeat(change.impactAssessment || '')) errors.push(`status_repeat:impactAssessment:${field}`);
    if (held && statusRepeat(change.holdReason || '')) errors.push(`status_repeat:holdReason:${field}`);
    if (held && choice && compactText(input) === compactText(choice)) errors.push(`input_echo_only:${field}`);
    const choiceOnly = experience && !supplement.trim();
    if (choiceOnly && held && typeof change.impactAssessment === 'string' && change.impactAssessment.trim()) {
      const impact = change.impactAssessment;
      const relates =
        field === 'hypotheses'
          ? /계획|선택/.test(impact) && /가설|미확인|관련/.test(impact)
          : /계획|선택/.test(impact) && /판단|관련|근거/.test(impact);
      if (!relates) errors.push(`trace_relation_missing:${field}`);
    }
    if (held && typeof change.impactAssessment === 'string' && genericHold(change.impactAssessment)) {
      errors.push(`review_hold_generic:impactAssessment:${field}`);
    }
    if (assertsClaim && input.trim() && !/양조장|확정|계약/.test(input)) errors.push(`claim_unlinked:${field}`);
  }
  const nextVerification = typeof parsed.nextVerification === 'string' ? parsed.nextVerification : '';
  const nextQuestion = typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion : '';
  const claim = /확정되었|확정했다|계약을 맺|계약했다|확보했다|확보되었/.test(supplement);
  if (experience && !supplement.trim() && (nextVerification.includes('양조장 후보') || nextQuestion.includes('양조장 후보'))) {
    errors.push('plan_not_from_input');
  }
  if (experience && claim && !/계약서|증빙|입금/.test(nextVerification)) errors.push('claim_verification_missing');
  const judgment = typeof parsed.judgment === 'string' ? parsed.judgment : '';
  if (choice && (compactText(judgment) === compactText(choice) || judgment.includes(choice))) errors.push('choice_promoted_to_judgment');
  const previousHypotheses = Array.isArray(previous.hypotheses) ? previous.hypotheses : [];
  const nextHypotheses = Array.isArray(parsed.hypotheses) ? parsed.hypotheses.filter((item) => typeof item === 'string') : [];
  const previousLine = previousHypotheses.join(' / ');
  const nextLine = nextHypotheses.join(' / ');
  if (
    (previousLine === '미확인' || previousLine === '') &&
    nextLine &&
    nextLine !== previousLine &&
    (!supplement.trim() || claim)
  ) {
    errors.push('hypothesis_unconfirmed_replaced');
  }
  if (/수요/.test(nextLine) && /있을|있다|존재|예상/.test(nextLine)) errors.push('hypothesis_demand_ungrounded');
  if (experience && choice && !nextVerification.includes(choice)) errors.push('next_verification_choice_absent');
  const previousPlan =
    previous.analysis && typeof previous.analysis.nextVerification === 'string' ? previous.analysis.nextVerification : '';
  const marketingUnfocused = (plan) => {
    if (!/온라인 마케팅/.test(plan)) return false;
    if (/및 온라인 마케팅|같이|함께|동시에/.test(plan)) return true;
    return !/그 다음|그 뒤|이후|나중|남아/.test(plan);
  };
  if (experience && !supplement.trim() && marketingUnfocused(nextVerification)) errors.push('priority_plan_unfocused');
  if (experience && !supplement.trim() && /온라인 마케팅/.test(previousPlan) && !/온라인 마케팅/.test(nextVerification)) {
    errors.push('priority_task_dropped');
  }
  const storedQuestion = typeof previous.nextQuestion === 'string' ? previous.nextQuestion.trim() : '';
  if (experience && storedQuestion && nextQuestion.trim() === storedQuestion && (!supplement.trim() || claim)) errors.push('question_unchanged');
  if (experience && claim && !/계약서|증빙|입금/.test(nextQuestion)) errors.push('question_claim_unlinked');
  if (experience && !supplement.trim() && nextQuestion.includes('양조장 후보')) errors.push('question_not_from_input');
  if (experience && !nextQuestion.includes('체험')) {
    const questionMarkers = ['예약 고객', '예약', '가격', '계약', '확정된 양조장', '양조장'].filter(
      (marker) => supplement.includes('없') && supplement.includes(marker),
    );
    const focus = questionMarkers.length > 0 ? questionMarkers : ['체험'];
    if (!focus.some((marker) => nextQuestion.includes(marker))) errors.push('next_question_unknown_missing');
  }
  const linked = [
    judgment,
    nextLine,
    nextVerification,
    nextQuestion,
    ...changes.map((item) => (item && typeof item.reason === 'string' ? item.reason : '')),
  ].join('\n');
  if (choice && !linked.includes(choice)) errors.push('choice_unlinked');
  const previousJudgment = typeof previous.judgment === 'string' ? previous.judgment.trim() : '';
  if (!supplement.trim() && previousJudgment && judgment.trim() !== previousJudgment) errors.push('judgment_changed_by_choice');
  for (const field of ['judgment', 'hypotheses']) {
    const change = changes.find((item) => item && item.field === field);
    if (change && change.decision === 'changed' && change.sufficiencyAssessment === 'insufficient') {
      errors.push(`sufficiency_conflict:${field}`);
    }
  }
  return [...new Set(errors)];
}

function failedReviewPhrases(raw) {
  if (!raw) return { judgmentReason: '', hypothesesReason: '', plan: '' };
  try {
    const parsed = JSON.parse(raw);
    const changes = Array.isArray(parsed.changes) ? parsed.changes : [];
    const reasonFor = (field) => {
      const change = changes.find((item) => item && item.field === field);
      return change && typeof change.reason === 'string' ? change.reason.trim().slice(0, 80) : '';
    };
    return {
      judgmentReason: reasonFor('judgment'),
      hypothesesReason: reasonFor('hypotheses'),
      plan: typeof parsed.nextVerification === 'string' ? parsed.nextVerification.trim().slice(0, 120) : '',
    };
  } catch {
    return { judgmentReason: '', hypothesesReason: '', plan: '' };
  }
}

export function repairMessage(errors, failedRaw) {
  const has = (code) => errors.some((error) => error === code || String(error).startsWith(`${code}:`));
  const lines = [
    '이전 JSON은 저장되지 않았다.',
    `실패 코드: ${errors.join(',')}.`,
    '이전 JSON과 같은 응답을 다시 내면 실패다.',
    '여섯 검토 필드를 비우거나 선택 문장만 복사하지 마라.',
    '없는 확정 사실을 만들지 마라. 수요가 있다고 단정하지 마라.',
    'retentionDecision은 decision과 같아야 한다.',
    'judgment와 hypotheses는 문장이 previous와 같으면 decision이 retained다. nextVerification은 내용이 바뀌면 decision이 changed다. 문장을 유지한 채 changed로 두면 실패다.',
    'judgment.reason과 hypotheses.reason 각각에 영향, 유지 이유, 근거가 부족, 바꾸려면 필요한 증거를 모두 넣어라. holdReason에만 두면 실패다.',
  ];
  if (has('choice_promoted_to_judgment') || has('judgment_changed_by_choice')) {
    lines.push('judgment.current는 입력의 previousJudgment와 같은 문장으로 되돌려라. decision은 retained다. 선택은 검증 우선순위이며 판단의 증거가 아니다.');
  }
  if (has('input_echo_only')) {
    lines.push('inputConsidered를 다시 써라. founderChoice.label과 같으면 실패다. 그 문장만 남겨 두지 마라.');
  }
  if (has('status_repeat') || has('trace_relation_missing')) {
    lines.push('impactAssessment와 holdReason에 여전히 유효하다, 변화가 없다, 새로운 정보가 없다만 쓰지 마라. 선택이 판단의 근거인지, 가설과 관련되는지, 검증 계획의 우선순위인지를 구분해 적어라. hypotheses.impactAssessment에는 선택 또는 계획, 그리고 가설 또는 미확인을 적어라.');
  }
  if (
    has('retention_hold_missing') ||
    has('reason_insufficient') ||
    has('review_hold_generic') ||
    has('retention_sufficiency_missing') ||
    has('retention_effect_missing')
  ) {
    lines.push('reason 한 문장 안에 바꾸지 않고 유지, 근거가 부족, 미치는 영향, 아직 필요한 증거를 넣어라. holdReason에만 두면 실패다. 동일하며, 추가 정보가 필요하다, 방향성이 명확하다만 쓰면 실패다.');
  }
  if (has('retention_evidence_missing') || has('trace_evidence_unrelated')) {
    lines.push('reason과 holdReason과 evidenceNeeded에 아직 없는 증거를 적어라. 체험 선택이면 고객 인터뷰나 예약 의향이다. 확정 주장이면 계약서나 입금 증빙이다.');
  }
  if (has('hypothesis_unconfirmed_replaced') || has('hypothesis_demand_ungrounded')) {
    lines.push('hypotheses.current는 저장된 가설 그대로다. 미확인이면 미확인만 둔다. 수요가 있다, 있을 것이다, 성공 가능성을 높인다를 넣지 마라.');
  }
  const claimRepair =
    has('claim_unmarked') ||
    has('claim_promoted_to_fact') ||
    has('claim_verification_missing') ||
    has('claim_unlinked') ||
    has('question_claim_unlinked') ||
    has('retention_input_missing');
  if (claimRepair) {
    lines.push(
      '확정 주장은 주장으로 적고 확인된 사실이 아니라고 적어라. judgment와 hypotheses의 reason에도 양조장 또는 계약, 바꾸지 않고 유지, 근거가 부족, 계약서가 필요를 넣어라. holdReason에만 두면 실패다. evidenceStatus는 unverified-input이다. judgment.current와 hypotheses.current가 previous와 같으면 그 decision은 retained다. 문장을 유지한 채 changed로 두면 실패다. nextVerification.current는 founderChoice.label을 그대로 포함하고 계약서 또는 입금 증빙 확인을 함께 담는다. 라벨을 다른 말로 바꾸면 실패다. nextVerification.decision만 changed다. sufficiencyAssessment는 partial이다.',
    );
  } else if (
    has('next_verification_choice_absent') ||
    has('choice_unlinked') ||
    has('priority_plan_unfocused') ||
    has('priority_task_dropped') ||
    has('plan_not_from_input')
  ) {
    lines.push(
      'nextVerification.current는 founderChoice.label을 그대로 포함한다. 라벨을 다른 말로 바꾸면 실패다. 체험 프로그램의 수요와 실행 가능성을 먼저 확인하는 순서를 잇는다. previousVerification에 온라인 마케팅 검증이 있으면 빼지 마라. 그 다음에도 온라인 마케팅 검증은 남아 있다고 적어라. 및, 같이, 함께로 붙이면 실패다. 수요가 확인되었다고 쓰지 마라. nextVerification.decision만 changed다. judgment.decision은 retained다.',
    );
  }
  if (has('decision_mismatch')) {
    lines.push('current가 previous와 같으면 decision과 retentionDecision은 retained다. 문장을 유지한 채 changed로 두면 실패다. current가 다르면 decision은 changed이고 sufficiencyAssessment는 partial이다. 판단의 유지와 검증 계획의 변경은 다른 결정이다.');
  }
  if (
    has('follow_up_output_previous') ||
    has('question_unchanged') ||
    has('question_not_from_input') ||
    has('next_question_unknown_missing') ||
    has('question_claim_unlinked') ||
    has('plan_not_from_input')
  ) {
    lines.push(
      'nextQuestion.previous는 previousAnalysis.nextQuestion과 같다. current가 그 질문과 같으면 실패다. current는 이번 입력의 남은 불확실성을 묻는다. 추가 설명이 없으면 미확인 가설의 체험 참여 의향이나 고객 인터뷰를 묻는다. 확정 주장이 있으면 계약서나 입금 증빙을 묻는다. 입력에 없는 다른 검증 대상으로 바꾸지 마라.',
    );
  }
  if (has('sufficiency_conflict')) {
    lines.push('선택만으로 judgment를 changed로 두지 마라. 문장이 같은데 changed이면서 sufficiencyAssessment가 insufficient이면 실패다. retained의 sufficiencyAssessment는 insufficient다. changed인 nextVerification의 sufficiencyAssessment는 partial이다.');
  }
  const failed = failedReviewPhrases(failedRaw);
  if (failed.judgmentReason) lines.push(`judgment.reason의 이전 문장은 실패다. 다시 쓰지 마라. ${failed.judgmentReason}`);
  if (failed.hypothesesReason) lines.push(`hypotheses.reason의 이전 문장은 실패다. 다시 쓰지 마라. ${failed.hypothesesReason}`);
  if (failed.plan.includes('및')) lines.push(`nextVerification의 이전에 및이 있다. 및을 빼고 그 다음에도 온라인 마케팅 검증은 남아 있다고 적어라. ${failed.plan}`);
  lines.push('같은 스키마의 JSON만 반환하라.');
  return lines.join(' ');
}

function responseFormatBody(request) {
  const format = request.responseFormat;
  if (format?.type === 'json_schema' && format.schema && typeof format.schema === 'object') {
    const { title, ...schema } = format.schema;
    const name = typeof title === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(title) ? title : 'structured_output';
    return { type: 'json_schema', json_schema: { name, strict: true, schema } };
  }
  return { type: 'json_object' };
}

function measuredUsage(calls) {
  if (calls.length === 0 || calls.some((call) => call.usageKnown !== true || typeof call.totalTokens !== 'number')) return null;
  return {
    promptTokens: calls.reduce((sum, call) => sum + call.promptTokens, 0),
    completionTokens: calls.reduce((sum, call) => sum + call.completionTokens, 0),
    totalTokens: calls.reduce((sum, call) => sum + call.totalTokens, 0),
  };
}

function jsonObject(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

async function oneCall(apiKey, promptVersion, request) {
  const prompts = {
    systemPrompt: messageContent(request, 'system'),
    userPrompt: messageContent(request, 'user'),
  };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: false,
        response_format: responseFormatBody(request),
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const requestId = response.headers.get('x-request-id');
    const body = await response.text();
    if (!response.ok) {
      return {
        promptVersion,
        status: 'failed',
        completionId: null,
        requestId,
        model: request.model,
        finishReason: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        usageKnown: false,
        jsonParsed: false,
        error: safeLine(body).slice(0, 300),
        ...prompts,
        raw: null,
      };
    }
    const data = JSON.parse(body);
    const raw = data.choices?.[0]?.message?.content ?? '';
    const usage = data.usage ?? {};
    return {
      promptVersion,
      status: raw.trim() ? 'succeeded' : 'failed',
      completionId: data.id ?? null,
      requestId,
      model: data.model ?? request.model,
      finishReason: data.choices?.[0]?.finish_reason ?? null,
      promptTokens: usage.prompt_tokens ?? null,
      completionTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      usageKnown: typeof usage.total_tokens === 'number',
      jsonParsed: jsonObject(raw),
      error: raw.trim() ? null : 'empty_response',
      ...prompts,
      raw,
    };
  } catch (error) {
    return {
      promptVersion,
      status: 'failed',
      completionId: null,
      requestId: null,
      model: request.model,
      finishReason: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      usageKnown: false,
      jsonParsed: false,
      error: safeLine(error instanceof Error ? error.message : 'model_error').slice(0, 300),
      ...prompts,
      raw: null,
    };
  }
}

async function main() {
  if (!shouldRunPreviewQualityCompare(process.env)) {
    console.log('preview-quality-compare skip');
    return;
  }
  const config = supabaseConfig(process.env);
  if (!config) {
    console.log('preview-quality-compare supabase=absent');
    return;
  }
  await ensureBucket(config);
  const existing = await readStored(config);
  if (completed(existing)) {
    console.log(`preview-quality-compare skip status=${existing.status}`);
    return;
  }
  if (existing?.status === 'started') {
    const ageMs = Date.now() - Date.parse(existing.startedAt ?? '');
    if (Number.isFinite(ageMs) && ageMs < 20 * 60 * 1000) {
      console.log('preview-quality-compare skip status=started');
      return;
    }
  }

  const startedAt = new Date().toISOString();
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const request = fixture.requests?.[0]?.request;
  if (!request?.messages || !Array.isArray(fixture.requests)) {
    throw new Error('reflection_fixture_invalid');
  }
  const apiKey = process.env.GPT_API_KEY?.trim() || '';
  console.log(`preview-quality-compare start run=${PREVIEW_COMPARE_RUN_ID} gpt_key=${apiKey ? 'present' : 'absent'}`);
  await writeStored(config, {
    runId: PREVIEW_COMPARE_RUN_ID,
    priorRunId: PREVIEW_COMPARE_PRIOR_RUN_ID,
    status: 'started',
    startedAt,
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  });

  const calls = [];
  for (const item of fixture.requests) {
    if (!apiKey) {
      calls.push({
        promptVersion: item.promptVersion,
        status: 'not_run',
        completionId: null,
        requestId: null,
        model: null,
        finishReason: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        usageKnown: false,
        jsonParsed: null,
        error: null,
        systemPrompt: messageContent(item.request, 'system'),
        userPrompt: messageContent(item.request, 'user'),
        raw: null,
      });
      continue;
    }
    const first = await oneCall(apiKey, item.promptVersion, item.request);
    first.reviewGaps = first.raw ? reviewFieldGaps(first.raw, first.userPrompt) : [];
    calls.push(first);
    if (first.raw && first.reviewGaps.length > 0) {
      const repairRequest = {
        ...item.request,
        messages: [
          ...item.request.messages,
          { role: 'assistant', content: first.raw },
          { role: 'user', content: repairMessage(first.reviewGaps, first.raw) },
        ],
      };
      const repair = await oneCall(apiKey, `${item.promptVersion}:repair`, repairRequest);
      repair.reviewGaps = repair.raw ? reviewFieldGaps(repair.raw, first.userPrompt) : [];
      repair.repairPrompt = repairMessage(first.reviewGaps, first.raw);
      repair.sameAsFirst = repair.raw === first.raw;
      calls.push(repair);
    }
  }

  const status = apiKey ? 'RECORDED' : 'NOT RUN';
  const maxTokens = request.maxTokens ?? null;
  await writeStored(config, {
    runId: PREVIEW_COMPARE_RUN_ID,
    priorRunId: PREVIEW_COMPARE_PRIOR_RUN_ID,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    error: apiKey ? null : 'GPT_API_KEY missing',
    productFollowUpInvoked: false,
    reflectionScored: false,
    model: request.model ?? 'gpt-4o-mini',
    temperature: request.temperature ?? 0.2,
    maxTokens,
    responseFormat: request.responseFormat?.type ?? 'json_object',
    repairCount: Math.max(0, calls.filter((call) => call.promptVersion?.endsWith(':repair')).length),
    usage: measuredUsage(calls.filter((call) => call.status !== 'not_run')),
    businessInput: fixture.businessInput,
    confounders: fixture.confounders,
    report: {
      status,
      reason: apiKey ? null : 'GPT_API_KEY missing',
      model: request.model ?? 'gpt-4o-mini',
      temperature: request.temperature ?? 0.2,
      maxTokens,
      responseFormat: request.responseFormat?.type ?? 'json_object',
      businessInput: fixture.businessInput,
      confounders: fixture.confounders,
      productFollowUpInvoked: false,
      reflectionScored: false,
      calls,
    },
  });
  console.log(`preview-quality-compare stored status=${status}`);
}

if (invokedDirectly()) {
  main().catch((error) => {
    console.log(`preview-quality-compare failed ${safeLine(error instanceof Error ? error.message : 'error')}`);
  });
}
