/**
 * Real-business calibration inputs for S.I. V1.
 * Analyzer must judge these without name-specific branches.
 */

export type SiCalibrationCaseId = 'juinjip' | 'lmulm' | 'ridm';

export type SiCalibrationCase = {
  id: SiCalibrationCaseId;
  title: string;
  documentText: string;
};

export const SI_CALIBRATION_CASES: Record<SiCalibrationCaseId, SiCalibrationCase> = {
  juinjip: {
    id: 'juinjip',
    title: '주인집',
    documentText: `주인집은 영세 전통주 양조장의 온라인 마케팅을 연결하는 사업이다.

영세한 양조장들이 온라인 마케팅을 잘 못하고 있어서, 양조장을 온라인 시장에 홍보하고 지역경제를 활성화하는 모델입니다.

타깃은 MZ 관광객과 FIT 개별 여행객으로 보고 있다.
사용자는 전통주 체험을 원하는 관광객이고, 실제 비용을 내는 구매자는 양조장 대표가 될 것으로 본다.

아직 앱이나 서비스는 출시되지 않았고, 매출은 없다.
MZ와 FIT가 실제로 이 서비스를 원하는지는 조사되지 않았다.
양조장 대표가 마케팅비를 낼 의향인지도 확인되지 않았다.

경쟁 대안으로는 각 양조장이 직접 인스타그램·네이버에 올리는 방식과 지역 관광 안내소가 있다.`,
  },
  lmulm: {
    id: 'lmulm',
    title: 'LMULM',
    documentText: `LMULM은 교보문고 사내벤처에서 출발한 한정판 문구 브랜드이자 C2C 재판매 플랫폼이다.

교보에서 분사하여 독립 법인으로 운영 중이며, 자체 앱을 출시했다.
오로라 한정판 문구를 실제로 판매했고, 공급망과 초기 고객 구매가 존재한다.
1차 한정판 판매 매출이 있다.

사업 모델은 한정판을 산 구매자가 이후 C2C로 재판매하고, 그 거래가 반복되는 것이다.
현재까지 1차 판매는 있으나, C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.
재구매·재판매 등록·2차 거래 데이터는 아직 없다.

기존 대안은 중고나라·번개장터 같은 범용 중고 거래와 브랜드 공식 재입고다.`,
  },
  ridm: {
    id: 'ridm',
    title: 'RIDM AI',
    documentText: `RIDM AI(ridm.ai)는 감정과 기억을 함께 다루는 AI 컴패니언이다.

사용자는 대화하며 감정을 기록하고, AI가 기억을 쌓아 관계를 유지한다.
웹사이트가 있고 제품 콘셉트는 공개되어 있다.

아직 유료 고객과 결제자는 확인되지 않았다.
어떤 직무(Job-to-be-done)를 대체하는 제품인지도 검증되지 않았다.
매출·파일럿·고객 인터뷰 검증은 없다.
누가 왜 돈을 내야 하는지가 정의되지 않았다.

기존 대안은 일반 챗봇, 일기 앱, 상담 서비스다.`,
  },
};

export function getSiCalibrationCase(id: SiCalibrationCaseId): SiCalibrationCase {
  return SI_CALIBRATION_CASES[id];
}
