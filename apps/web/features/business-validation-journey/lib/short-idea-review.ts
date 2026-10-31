import type { FounderAnswer, Intake, NextQuestion } from './journey-types';

const NOT_VALIDATED = '검증된 사실이 아니다. 사업성 판단은 유보한다.';

const STOCK_AND_DELIVERY_INCIDENT =
  '최근 한 달 동안 재고나 배송 실수로 실제 손실이 발생한 사례가 있나요? 있다면 어떤 일이었고 얼마나 손실이 났나요?';

export type ShortAnswerEffect = {
  nextText: string;
  judgmentChanged: boolean;
  reason: string;
  held: boolean;
  affected: string[];
};

const THEME_MARKERS = [
  { key: '재고', label: '재고' },
  { key: '배송', label: '배송' },
  { key: '단골', label: '단골 관리' },
  { key: '누락', label: '누락' },
] as const;

export function problemThemes(problem: string): string[] {
  return THEME_MARKERS.filter((item) => problem.includes(item.key)).map((item) => item.label);
}

export function openingShortIdeaJudgment(intake: Intake): string {
  const themes = problemThemes(intake.problem);
  const frequency =
    themes.length > 1
      ? `${themes.join(', ')} 중 무엇이 가장 잦고 비용이 큰지는 확인하지 않았다.`
      : '문제가 얼마나 자주, 얼마의 비용으로 발생하는지는 확인하지 않았다.';
  return [
    `확인된 진술. 사업은 「${intake.business.trim()}」.`,
    `고객으로 적힌 사람은 「${intake.customer.trim()}」.`,
    `문제로 적은 문장은 「${intake.problem.trim()}」.`,
    '이 세 문장은 창업자 진술이다. 고객 수, 가격, 손실액, 시장 규모는 입력에 없으면 만들지 않는다.',
    `실제 사용자가 「${intake.customer.trim()}」인지, 그 사람이 구매 결정권자인지는 확인하지 않았다.`,
    frequency,
    '그 손실이 소프트웨어 비용을 낼 만큼 큰지, 대체 수단이 있는지는 확인하지 않았다.',
    NOT_VALIDATED,
  ].join(' ');
}

export function readLooseIntake(text: string): Intake | null {
  const business = labeled(text, ['사업 설명', '사업']) || labeled(text, ['프로젝트 이름']);
  const customer = labeled(text, ['대상 고객', '대상', '고객']);
  const problem = labeled(text, ['문제', '핵심 가치', '핵심']);
  if (!business || !customer || !problem) return null;
  return {
    business,
    customer,
    problem,
    solution: '',
    payer: '',
    revenue: '',
    evidence: '',
    url: '',
  };
}

export function nextShortIdeaQuestion(
  intake: Intake,
  asked: Set<string>,
  answers: { uncertaintyId: string; choiceId: string }[],
): NextQuestion | null {
  if (!asked.has('u-short-incident')) return incidentQuestion(intake.problem);
  if (!asked.has('u-short-buyer')) return buyerQuestion(intake.customer);
  const incident = latest(answers, 'u-short-incident');
  if (incident === 'have_case' && !asked.has('u-short-wtp')) return willingnessQuestion();
  const themes = problemThemes(intake.problem);
  if (themes.length > 1 && !asked.has('u-short-focus')) return focusQuestion(themes);
  return null;
}

export function shortIdeaAnswerEffect(answer: FounderAnswer, intake: Intake): ShortAnswerEffect | null {
  switch (answer.uncertaintyId) {
    case 'u-short-incident':
      return incidentEffect(answer);
    case 'u-short-buyer':
      return buyerEffect(answer, intake.customer);
    case 'u-short-wtp':
      return willingnessEffect(answer);
    case 'u-short-focus':
      return focusEffect(answer);
    default:
      return null;
  }
}

export function shortIdeaVerification(
  intake: Intake,
  answers: FounderAnswer[],
): { id: string; evidenceNeeded: string; action: string; affectedHypothesisIds: string[] } | null {
  const incident = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-short-incident');
  if (!incident) return null;
  const buyer = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-short-buyer');
  const lines = [
    incident.choiceId === 'have_case'
      ? incident.freeText.trim()
        ? `적은 사례 「${incident.freeText.trim()}」를 장부나 메모 한 줄과 대조한다. 없는 금액은 만들지 않는다.`
        : '사례가 있다는 진술의 내용과 금액을 한 줄로 받는다. 금액을 만들지 않는다.'
      : '최근 한 달의 손실 사례가 확인되지 않았다. 사례 한 건이 생기기 전에는 가격을 만들지 않는다.',
  ];
  if (!buyer || buyer.choiceId === 'unknown') {
    lines.push(`「${intake.customer}」이 직접 쓰는지, 결제하는지를 그 사람의 말로 구분한다.`);
  }
  return {
    id: 'verify-short-idea',
    evidenceNeeded: '최근 손실 사례 한 건과, 쓰는 사람과 결제하는 사람의 구분. 입력에 없는 가격은 만들지 않는다.',
    action: lines.join(' '),
    affectedHypothesisIds: ['h-customer', 'h-problem', 'h-payer'],
  };
}

function incidentQuestion(problem: string): NextQuestion {
  const prompt =
    problem.includes('재고') && problem.includes('배송')
      ? STOCK_AND_DELIVERY_INCIDENT
      : `최근 한 달 동안 「${problem.trim()}」로 실제 비용이나 손실이 발생한 사례가 있나요? 있다면 어떤 일이었고 얼마나 손실이 났나요? 없는 금액은 적지 않아도 됩니다.`;
  return ask({
    uncertaintyId: 'u-short-incident',
    hypothesisId: 'h-problem',
    prompt,
    whyDifferent: '고객과 문제 문장은 받았다. 고객 수나 가격을 추정하지 않고, 최근 손실 사례가 있는지만 먼저 묻는다.',
    purpose: '문제로 적은 일이 최근 한 달에 실제 손실을 만들었는지 확인한다.',
    answerBranches: '사례가 있으면 쓰는 사람과 결제하는 사람을 가른다. 없거나 모르면 금액을 만들지 않고 구매 결정권자를 묻는다.',
    unchangedWhen: '모르겠다는 답이면 손실액을 추정으로 채우지 않고 판단 문장을 유지한다.',
    choices: [
      { id: 'have_case', label: '최근 한 달 사례가 있다', grade: 'founder_estimate' },
      { id: 'none', label: '최근 한 달에는 없다', grade: 'founder_estimate' },
      { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
    ],
  });
}

function buyerQuestion(customer: string): NextQuestion {
  return ask({
    uncertaintyId: 'u-short-buyer',
    hypothesisId: 'h-customer',
    prompt: `「${customer}」이 이 서비스를 직접 쓰는 사람인가요, 구매를 결정하는 사람인가요? 직원 등 다른 사용자가 있다면 구분해 주세요.`,
    whyDifferent: '손실 사례를 먼저 물었다. 같은 사례 질문을 반복하지 않고, 적힌 고객이 사용자인지 구매 결정권자인지를 묻는다.',
    purpose: '실제 사용자와 구매 결정권자를 구분한다.',
    answerBranches: '구분했다는 답도 진술이다. 결제 기록으로 올리지 않는다.',
    unchangedWhen: '아직 구분하지 못하면 결정권자를 추정으로 채우지 않는다.',
    choices: [
      { id: 'same', label: '적힌 고객이 직접 쓰고 결제도 한다', grade: 'founder_estimate' },
      { id: 'staff_uses', label: '다른 사람이 쓰고, 적힌 고객이 결제한다', grade: 'founder_estimate' },
      { id: 'unknown', label: '쓰는 사람과 결제하는 사람을 아직 구분하지 못했다', grade: 'unknown' },
    ],
  });
}

function willingnessQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-short-wtp',
    hypothesisId: 'h-payer',
    prompt: '그 문제로 생긴 손실이 소프트웨어 비용을 낼 만큼 큰지 확인했나요? 가격은 입력에 없으면 제안하지 않습니다.',
    whyDifferent: '구매 결정권자를 물었다. 가격을 만들지 않고, 손실이 비용을 낼 만큼 큰지만 묻는다.',
    purpose: '지불 의사가 손실 크기와 연결되는지 확인한다.',
    answerBranches: '크다고 봐도 가격과 결제 사실이 아니다. 확인하지 않았으면 가격을 채우지 않는다.',
    unchangedWhen: '아직 확인하지 않은 답이면 가격을 만들지 않고 판단 문장을 유지한다.',
    choices: [
      { id: 'enough', label: '손실이 비용을 낼 만큼 크다고 본다', grade: 'founder_estimate' },
      { id: 'not_enough', label: '그만큼 크지는 않다고 본다', grade: 'founder_estimate' },
      { id: 'not_asked', label: '아직 확인하지 않았다', grade: 'unknown' },
    ],
  });
}

function focusQuestion(themes: string[]): NextQuestion {
  return ask({
    uncertaintyId: 'u-short-focus',
    hypothesisId: 'h-problem',
    prompt: `${themes.join(', ')} 중 최근 한 달에 가장 자주 비용을 만든 것은 무엇인가요? 횟수와 금액은 모르면 만들지 마세요.`,
    whyDifferent: '손실 여부, 구매 결정권자, 지불 여지를 이미 물었다. 문제 후보 중 비용이 반복되는 하나를 고르게 한다.',
    purpose: '반복 비용의 대상을 하나 고른다.',
    answerBranches: '고른 항목은 진술이다. 빈도를 추정으로 채우지 않는다.',
    unchangedWhen: '모르겠다는 답이면 빈도를 만들지 않고 판단 문장을 유지한다.',
    choices: [
      ...themes.map((label, index) => ({ id: `theme-${index}`, label, grade: 'founder_estimate' as const })),
      { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' as const },
    ],
  });
}

function incidentEffect(answer: FounderAnswer): ShortAnswerEffect {
  if (answer.choiceId === 'unknown') {
    return {
      nextText: '',
      judgmentChanged: false,
      reason: '최근 손실 사례를 아직 모른다. 손실액과 가격을 추정으로 채우지 않아 판단 문장은 유지한다.',
      held: false,
      affected: [],
    };
  }
  if (answer.choiceId === 'none') {
    return {
      nextText: `최근 한 달 손실 사례는 아직 없다는 창업자 진술이다. 손실액을 만들지 않는다. 구매 결정권자와 지불 의사는 아직 확인하지 않았다. ${NOT_VALIDATED}`,
      judgmentChanged: true,
      reason: '사례가 없다는 답으로 손실 금액을 채우지 않는다. 다음 빈칸은 적힌 고객이 구매 결정권자인지다.',
      held: false,
      affected: ['h-problem'],
    };
  }
  const note = answer.freeText.trim();
  const amountSentence = /[0-9]/.test(note)
    ? '문장에 숫자가 있다. 그 숫자를 확인된 손실액으로 올리지 않는다.'
    : '손실 금액은 적히지 않았다. 금액을 만들지 않는다.';
  return {
    nextText: [
      '최근 손실 사례가 있다는 창업자 진술이다.',
      note ? `적은 내용: 「${note}」.` : '어떤 일이었는지는 아직 비어 있다.',
      amountSentence,
      '구매 결정권자와, 그 손실이 소프트웨어 비용을 낼 만큼 큰지는 아직 확인하지 않았다.',
      NOT_VALIDATED,
    ].join(' '),
    judgmentChanged: true,
    reason: '사례 답은 진술이다. 장부와 대조하기 전에는 손실 사실로 바꾸지 않는다. 다음 빈칸은 구매 결정권자다.',
    held: false,
    affected: ['h-problem'],
  };
}

function buyerEffect(answer: FounderAnswer, customer: string): ShortAnswerEffect {
  if (answer.choiceId === 'unknown') {
    return {
      nextText: '',
      judgmentChanged: false,
      reason: `「${customer}」이 사용자인지 구매 결정권자인지 아직 구분하지 못했다. 결정권자를 추정으로 채우지 않아 판단 문장은 유지한다.`,
      held: false,
      affected: [],
    };
  }
  return {
    nextText: `쓰는 사람과 결제하는 사람에 대한 창업자 진술이다. 「${answer.choiceLabel}」. 「${customer}」의 결제 관찰은 없다. ${NOT_VALIDATED}`,
    judgmentChanged: true,
    reason: '사용자와 구매 결정권자를 구분했다는 답은 진술이다. 결제 원문이 없으면 지불 사실로 올리지 않는다.',
    held: false,
    affected: ['h-customer', 'h-payer'],
  };
}

function willingnessEffect(answer: FounderAnswer): ShortAnswerEffect {
  if (answer.choiceId === 'not_asked' || answer.choiceId === 'unknown') {
    return {
      nextText: '',
      judgmentChanged: false,
      reason: '손실이 소프트웨어 비용을 낼 만큼 큰지는 아직 확인하지 않았다. 가격을 만들지 않아 판단 문장은 유지한다.',
      held: false,
      affected: [],
    };
  }
  return {
    nextText: `지불 여부에 대한 창업자 진술이다. 「${answer.choiceLabel}」. 가격은 만들지 않았고 결제 사실은 아니다. ${NOT_VALIDATED}`,
    judgmentChanged: true,
    reason: '지불 답은 진술이다. 입력에 없는 가격을 제안하지 않는다.',
    held: false,
    affected: ['h-payer'],
  };
}

function focusEffect(answer: FounderAnswer): ShortAnswerEffect {
  if (answer.choiceId === 'unknown') {
    return {
      nextText: '',
      judgmentChanged: false,
      reason: '어떤 문제가 가장 자주 비용을 만드는지는 아직 모른다. 횟수를 만들지 않아 판단 문장은 유지한다.',
      held: false,
      affected: [],
    };
  }
  return {
    nextText: `반복 비용의 후보를 「${answer.choiceLabel}」로 골랐다는 창업자 진술이다. 횟수와 금액은 확인하지 않았다. ${NOT_VALIDATED}`,
    judgmentChanged: true,
    reason: '문제 하나를 골랐다는 답은 진술이다. 빈도와 금액을 추정으로 채우지 않는다.',
    held: false,
    affected: ['h-problem'],
  };
}

function latest(
  answers: { uncertaintyId: string; choiceId: string }[],
  uncertaintyId: string,
): string | undefined {
  return [...answers].reverse().find((answer) => answer.uncertaintyId === uncertaintyId)?.choiceId;
}

function labeled(text: string, labels: string[]): string {
  const lines = text.split(/\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    for (const label of labels) {
      const match = line.match(new RegExp(`^${label}\\s*[:：]\\s*(.*)$`));
      if (!match) continue;
      if (match[1]?.trim()) return match[1].trim();
      return following(lines, index + 1);
    }
  }
  return '';
}

function following(lines: string[], start: number): string {
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!line) continue;
    if (/^[^:\n]{1,24}[:：]/.test(line)) return '';
    return line;
  }
  return '';
}

function ask(input: Omit<NextQuestion, 'allowsFreeText'>): NextQuestion {
  return { ...input, allowsFreeText: true };
}
