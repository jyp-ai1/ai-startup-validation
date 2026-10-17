import {
  hasLedgerMarker,
  unknownCostAndDuration,
  type FactStatus,
  type NextVerificationExperiment,
} from './verification-outcome';

export type OmittedInputClaim = 'A2' | 'S3';

export type StoredModelJudgment = {
  output: string;
  fact: boolean;
  factStatus: FactStatus;
  verifiedFact: false;
  modelFact: boolean;
  ledgerEvidence: boolean;
  omittedFromModel: OmittedInputClaim[];
  nextExperiment: NextVerificationExperiment;
};

export function inputSection(source: string): string {
  const marker = '\n입력\n';
  const at = source.indexOf(marker);
  return at < 0 ? source : source.slice(at + marker.length);
}

function claimLine(section: string, id: OmittedInputClaim): string | null {
  const line = section
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${id}:`) || item.startsWith(`${id}：`));
  return line ?? null;
}

function coversA2(modelContent: string): boolean {
  return (
    modelContent.includes('A2') ||
    modelContent.includes('유지할 수 없') ||
    modelContent.includes('지원이 필수')
  );
}

function coversS3(modelContent: string): boolean {
  return (
    modelContent.includes('예상 연매출') ||
    modelContent.includes('10억') ||
    modelContent.includes('십억')
  );
}

export function hasLedgerEvidence(section: string): boolean {
  return hasLedgerMarker(section);
}

function experimentForOmissions(input: {
  omittedFromModel: OmittedInputClaim[];
  a2: string | null;
  s3: string | null;
  modelFact: boolean;
  fact: boolean;
}): NextVerificationExperiment {
  const subjects = input.omittedFromModel
    .map((id) => (id === 'A2' ? input.a2 : input.s3))
    .filter((item): item is string => Boolean(item));
  const hypothesis = subjects.length
    ? `모델 출력에 없는 입력: ${subjects.join(' / ')}. 모델 Fact ${input.modelFact}는 판정 Fact ${input.fact}와 별개다.`
    : `빠진 A2·S3 입력 행은 없다. 모델 Fact ${input.modelFact}는 판정 Fact ${input.fact}와 별개다.`;
  return {
    hypothesis,
    material: '주문 원장. 모회사·계열사 매출과 그 밖 매출이 나뉜 기록.',
    method: input.omittedFromModel.includes('S3')
      ? '원장에서 모회사·계열사 매출과 그 밖 매출을 나누고, 입력 S3의 예상 연매출 10억이 입금 항목인지 확인한다.'
      : input.omittedFromModel.includes('A2')
        ? 'A2는 모회사 지원이 없을 때의 매출 구성이다. 주문 원장에서 모회사·계열사 매출과 그 밖 매출을 나눈다.'
        : '빠진 A2·S3 입력 행은 없다. 모델 Fact와 판정 Fact는 별개다.',
    ...unknownCostAndDuration(),
    success: '원장에 두 매출이 나뉘어 있고, 예상 연매출 10억이 입금으로 적혀 있지 않다.',
    failure: '원장이 없거나, 예상 연매출 10억이 받은 매출로 적혀 있다.',
  };
}

/**
 * Reads the prompt's input section and one stored model object.
 * Omitted A2 and S3 lines are copied from that input, labeled as absent from the model.
 * A model Fact of true is not adopted when the input section has no ledger evidence.
 * verifiedFact stays false. The stored JSON is not rewritten.
 */
export function judgeStoredModelOutput(input: {
  sourceText: string;
  modelContent: string;
  modelFact: boolean;
}): StoredModelJudgment {
  const section = inputSection(input.sourceText);
  const ledgerEvidence = hasLedgerEvidence(section);
  const omittedFromModel: OmittedInputClaim[] = [];
  const carried: string[] = [];

  const a2 = claimLine(section, 'A2');
  if (a2 && !coversA2(input.modelContent)) {
    omittedFromModel.push('A2');
    carried.push(`입력에 있고 모델 출력에 없음: ${a2}`);
  }

  const s3 = claimLine(section, 'S3');
  if (s3 && !coversS3(input.modelContent)) {
    omittedFromModel.push('S3');
    carried.push(`입력에 있고 모델 출력에 없음: ${s3}`);
  }

  const modelContent = input.modelContent.trim();
  const output = [modelContent, ...carried].filter((item) => item.length > 0).join('\n');
  const fact = ledgerEvidence ? input.modelFact : false;

  return {
    output,
    fact,
    factStatus: '미확인',
    verifiedFact: false,
    modelFact: input.modelFact,
    ledgerEvidence,
    omittedFromModel,
    nextExperiment: experimentForOmissions({ omittedFromModel, a2, s3, modelFact: input.modelFact, fact }),
  };
}
