const LEDGER_MARKERS = ['원장', '결제', '입금', '세금계산서'] as const;

export type OmittedInputClaim = 'A2' | 'S3';

export type StoredModelJudgment = {
  output: string;
  fact: boolean;
  verifiedFact: false;
  modelFact: boolean;
  ledgerEvidence: boolean;
  omittedFromModel: OmittedInputClaim[];
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
  return LEDGER_MARKERS.some((marker) => section.includes(marker));
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

  return {
    output,
    fact: ledgerEvidence ? input.modelFact : false,
    verifiedFact: false,
    modelFact: input.modelFact,
    ledgerEvidence,
    omittedFromModel,
  };
}
