import type { DemoProjectSlug } from './demo-scenario-types';

export type DemoSeedQaStep = {
  targetGap: string;
  answer: string;
  prefilledAnswerDisplay: string;
};

const STAGE_PLAYBACK_ORDER = [
  'businessOneLiner',
  'customerPersona',
  'payer',
  'problemJtbd',
  'marketChannel',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
  'validationTestability',
] as const;

export function demoSeedQaSteps(slug: DemoProjectSlug): DemoSeedQaStep[] {
  const byGap: Record<DemoProjectSlug, Record<(typeof STAGE_PLAYBACK_ORDER)[number], DemoSeedQaStep>> =
    {
      clinicflow: {
        businessOneLiner: {
          targetGap: 'businessOneLiner',
          answer:
            '5~30인 피부·치과·한의원에 EMR 연동 예약·no-show 자동 리콜 SaaS를 제공합니다.',
          prefilledAnswerDisplay:
            '5~30인 피부·치과·한의원에 EMR 연동 예약·no-show 자동 리콜 SaaS',
        },
        customerPersona: {
          targetGap: 'customerPersona',
          answer:
            '5~30인 피부과·치과 원장과 실장. 원장이 진료와 예약 관리를 동시에 하는 경우가 많습니다.',
          prefilledAnswerDisplay: '원장·실장 — 소형 클리닉 운영진',
        },
        payer: {
          targetGap: 'payer',
          answer: '병원 법인 또는 원장 명의로 월 구독 SaaS 요금을 지불합니다.',
          prefilledAnswerDisplay: '병원 법인 / 원장 — 월 구독',
        },
        problemJtbd: {
          targetGap: 'problemJtbd',
          answer:
            '전화·수기 리콜로 no-show 15~25%가 발생하고, EMR과 예약 채널이 어긋납니다.',
          prefilledAnswerDisplay: 'no-show·리콜 누락·채널 불일치',
        },
        marketChannel: {
          targetGap: 'marketChannel',
          answer:
            '수도권 피부·치과 5곳 파일럿, 학회·EMR 파트너 소개, no-show 전후 리포트로 확장.',
          prefilledAnswerDisplay: '파일럿 5곳 → EMR·학회 채널',
        },
        alternativesCompetitors: {
          targetGap: 'alternativesCompetitors',
          answer: '네이버 예약, 똑닥, EMR 기본 알림, Peopleworks CRM, 수기 전화 리콜.',
          prefilledAnswerDisplay: 'O2O 예약앱·EMR 알림·CRM·수기',
        },
        differentiationVsAlternatives: {
          targetGap: 'differentiationVsAlternatives',
          answer:
            '진료과별 no-show 패턴 학습 + EMR API 연동 자동 리콜 시나리오가 핵심 차별점입니다.',
          prefilledAnswerDisplay: '과별 no-show 패턴 + EMR 연동 리콜',
        },
        validationTestability: {
          targetGap: 'validationTestability',
          answer:
            '파일럿에서 no-show 10%p 감소와 3개월 ROI를 측정하고, 월 구독 전환율로 검증합니다.',
          prefilledAnswerDisplay: 'no-show·ROI·구독 전환 측정',
        },
      },
      'local-sns': {
        businessOneLiner: {
          targetGap: 'businessOneLiner',
          answer: '직원 5명 이하 음식점·카페의 SNS·네이버 플레이스 홍보를 자동화합니다.',
          prefilledAnswerDisplay: '소규모 F&B SNS·플레이스 자동화',
        },
        customerPersona: {
          targetGap: 'customerPersona',
          answer: '서울·수도권 직원 5명 이하 음식점·카페 사장 (직접 운영).',
          prefilledAnswerDisplay: '소규모 F&B 사장',
        },
        payer: {
          targetGap: 'payer',
          answer: '사장 개인이 월 9.9만 원 구독료를 지불합니다.',
          prefilledAnswerDisplay: '사장 개인 — 월 구독',
        },
        problemJtbd: {
          targetGap: 'problemJtbd',
          answer: '홍보 시간이 없고 전문성이 부족해 이벤트·리뷰 응답이 누락됩니다.',
          prefilledAnswerDisplay: '시간 부족·공지·리뷰 누락',
        },
        marketChannel: {
          targetGap: 'marketChannel',
          answer: '20곳 파일럿, 배달앱·지역 상권 커뮤니티 제휴로 확장합니다.',
          prefilledAnswerDisplay: '20곳 파일럿 → 상권 제휴',
        },
        alternativesCompetitors: {
          targetGap: 'alternativesCompetitors',
          answer: '마케터 대행, Canva, ChatGPT, 네이버 스마트플레이스 단독.',
          prefilledAnswerDisplay: '대행·Canva·ChatGPT·플레이스',
        },
        differentiationVsAlternatives: {
          targetGap: 'differentiationVsAlternatives',
          answer: '업종별 템플릿 + 지역 키워드 + 게시 일정 자동이 차별점입니다.',
          prefilledAnswerDisplay: '업종·지역 템플릿 + 일정 자동',
        },
        validationTestability: {
          targetGap: 'validationTestability',
          answer: '게시 유지율 80%와 신규 리뷰 수 변화로 주 2시간→10분 가설을 검증합니다.',
          prefilledAnswerDisplay: '유지율·리뷰·시간 절감',
        },
      },
      fitbridge: {
        businessOneLiner: {
          targetGap: 'businessOneLiner',
          answer: 'D2C 의류·신발 브랜드 PDP에 AI 사이즈·핏 추천 SaaS 위젯을 제공합니다.',
          prefilledAnswerDisplay: 'D2C PDP AI 사이즈 추천 SaaS',
        },
        customerPersona: {
          targetGap: 'customerPersona',
          answer: '연 매출 5~50억 D2C 의류·신발 브랜드 PM·대표·CX 리드.',
          prefilledAnswerDisplay: 'D2C 브랜드 PM·대표',
        },
        payer: {
          targetGap: 'payer',
          answer: '브랜드 법인이 SaaS 구독과 성과 보너스를 지불합니다.',
          prefilledAnswerDisplay: '브랜드 법인 — SaaS + 보너스',
        },
        problemJtbd: {
          targetGap: 'problemJtbd',
          answer: '사이즈 불일치로 반품 30~40%, CS와 마진 압박이 큽니다.',
          prefilledAnswerDisplay: '고반품·CS·마진 압박',
        },
        marketChannel: {
          targetGap: 'marketChannel',
          answer: 'D2C 커뮤니티·SI 파트너, A/B PDP 파일럿으로 확장합니다.',
          prefilledAnswerDisplay: 'A/B PDP · D2C 커뮤니티',
        },
        alternativesCompetitors: {
          targetGap: 'alternativesCompetitors',
          answer: 'True Fit, 자체 ML, 정적 사이즈 차트, 단순 추천 위젯.',
          prefilledAnswerDisplay: 'True Fit·자체 ML·차트',
        },
        differentiationVsAlternatives: {
          targetGap: 'differentiationVsAlternatives',
          answer: '한국 체형·브랜드 실측 학습 + 반품 SLA 연동이 차별점입니다.',
          prefilledAnswerDisplay: '국내 체형·실측 + SLA 연동',
        },
        validationTestability: {
          targetGap: 'validationTestability',
          answer: 'A/B PDP에서 반품 8%p 감소와 반품 1%p당 절감액을 측정합니다.',
          prefilledAnswerDisplay: 'A/B 반품률·절감 KPI',
        },
      },
    };

  return STAGE_PLAYBACK_ORDER.map((gap) => byGap[slug][gap]);
}
