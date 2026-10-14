/**
 * Validation action is a separate output from whyNow.
 * Weak payment evidence and missing evidence must not share one sentence.
 */

export function validationActionForAnswer(input: {
  answer: string;
  kind?: string | null;
}): string {
  const answer = input.answer.trim();
  if (input.kind === 'unknown' || /아직\s*모르|모르겠/.test(answer)) {
    return '아직 확정되지 않은 가설입니다. 기존 이해를 유지하고 한 가지 구체 예로 다시 확인합니다. 검증된 사실이 아닙니다.';
  }
  if (/증거는 없|아직\s*실제\s*결제/.test(answer)) {
    return '결제·사용 증거가 없습니다. 누구에게 어떤 금액을 확인할지 검증 행동을 정합니다. 대화만으로 닫지 않습니다.';
  }
  if (/이미\s*결제|결제\s*\d|돈을 내고/.test(answer)) {
    return '결제 단서는 약증거입니다. 누가, 얼마를, 어떤 기록으로 냈는지 확인합니다. 검증된 사실이 아닙니다.';
  }
  if (input.kind === 'revise') {
    return '고객 가설이 바뀌었습니다. 새 고객 기준으로 문제가 같은지 확인하는 검증입니다. 이전 고객은 현재 사실이 아닙니다.';
  }
  if (input.kind === 'accurate') {
    return '창업자 확인은 이해 마감입니다. 현장 결제·사용을 확인하는 검증 행동은 아직 없습니다.';
  }
  return '이 답은 확인된 주장입니다. 검증된 사실로 닫는 행동이 아닙니다.';
}

export function questionBoundToRevisedCustomer(
  question: string,
  answer: string,
): string {
  const subject = answer.match(/사람은\s+(.+?)(?:입니다|이에요|예요|[.。]|$)/)?.[1]?.trim();
  if (!subject || question.includes(subject)) return question;
  return `새 고객 「${subject}」 기준으로, ${question}`;
}

export function isUncertainFounderAnswer(text: string): boolean {
  return /아직\s*모르|모르겠/.test(text.trim());
}

export function answerRevisesQuotedHypothesis(question: string, answer: string): boolean {
  const hypothesis = [...question.matchAll(/「([^」]+)」/g)]
    .map((match) => match[1] ?? '')
    .find((text) => text.length >= 4);
  if (!hypothesis) return false;
  return !answer.includes(hypothesis.slice(0, Math.min(8, hypothesis.length)));
}
