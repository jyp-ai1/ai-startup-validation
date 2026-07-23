import fs from 'node:fs';
import path from 'node:path';

const messagesDir = path.join('packages', 'i18n', 'src', 'messages');
const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));
const koPath = path.join(messagesDir, 'ko.json');
const ko = JSON.parse(fs.readFileSync(koPath, 'utf8'));

function setPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function leafKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...leafKeys(v, p));
    } else {
      keys.push(p);
    }
  }
  return keys;
}

/** Full Korean translations for intelligence.* leaf keys (198 total) */
const INTELLIGENCE_KO = {
  'intelligence.platformTitle': 'AI 전략 컨설턴트',
  'intelligence.platformSubtitle': '경영진 의사결정 플랫폼',
  'intelligence.emptyDesc':
    '프로젝트를 생성하면 준비도 점수, 전문가 의견, 권장 조치를 확인할 수 있습니다.',
  'intelligence.startupReadiness': '스타트업 준비도',
  'intelligence.grade': '등급',
  'intelligence.decision': '의사결정',
  'intelligence.ranking': '순위',
  'intelligence.readinessTitle': '준비도 개요',
  'intelligence.readiness.startup': '스타트업 준비도',
  'intelligence.readiness.investment': '투자 준비도',
  'intelligence.readiness.grant': '지원사업 준비도',
  'intelligence.readiness.ai': 'AI 준비도',
  'intelligence.status.excellent': '우수',
  'intelligence.status.good': '양호',
  'intelligence.status.needsWork': '보완 필요',
  'intelligence.status.critical': '위험',
  'intelligence.actionCenter': '액션 센터',
  'intelligence.actionCenterDesc': '검증 점수를 높이기 위한 우선순위 조치',
  'intelligence.action.priority': '우선순위 {n}',
  'intelligence.action.allComplete': '모든 우선순위 조치가 완료되었습니다',
  'intelligence.action.scoreImpact': '+{points}점 영향',
  'intelligence.action.timeWeeks': '약 {weeks}주',
  'intelligence.action.timeDays': '약 3일',
  'intelligence.action.statusPending': '대기',
  'intelligence.decisionTitle': '의사결정 분석',
  'intelligence.decisionDesc': 'LaunchLens가 이 판단을 내린 이유',
  'intelligence.chartsTitle': '분석',
  'intelligence.riskHeatmap': '리스크 히트맵',
  'intelligence.scoreBreakdown': '점수 분해',
  'intelligence.risk.low': '낮은 리스크',
  'intelligence.risk.medium': '보통',
  'intelligence.risk.high': '높음',
  'intelligence.risk.critical': '심각',
  'intelligence.riskTimeline': '리스크 및 타임라인',
  'intelligence.recentActivity': '최근 활동',
  'intelligence.expertTitle': '전문가 의견',
  'intelligence.expertDesc': '스타트업 가설에 대한 다학제적 관점',
  'intelligence.confidenceIndex': '신뢰도 지수',
  'intelligence.detailTable': '상세 기록',
  'intelligence.aiRecommendation': 'AI 권장',
  'intelligence.executiveSummary': '경영진 요약',
  'intelligence.fundingProbability': '투자 확률',
  'intelligence.confidence': '신뢰도',
  'intelligence.confidenceMeter': '신뢰도 지표',
  'intelligence.topInsights': '핵심 인사이트',
  'intelligence.whyVerdict': '이 판단의 근거',
  'intelligence.growthTimeline': '성장 타임라인',
  'intelligence.dataCards': '근거 카드',
  'intelligence.rawData': '원본 데이터',
  'intelligence.evidenceSnapshot': '근거 스냅샷',
  'intelligence.categories.startup': '스타트업',
  'intelligence.categories.investment': '투자',
  'intelligence.categories.technology': '기술',
  'intelligence.categories.government': '정부지원',
  'intelligence.categories.market': '시장 조사',
  'intelligence.categories.problem': '고객 조사',
  'intelligence.categories.competition': '경쟁',
  'intelligence.categories.businessModel': '비즈니스 모델',
  'intelligence.sentiment.positive': '긍정',
  'intelligence.sentiment.neutral': '중립',
  'intelligence.sentiment.negative': '부정',
  'intelligence.reliability.excellent': '매우 높은 신뢰도',
  'intelligence.reliability.reliable': '신뢰 가능',
  'intelligence.reliability.moderate': '보통',
  'intelligence.reliability.low': '낮은 신뢰도',
  'intelligence.summary.insufficient':
    '검증 데이터가 부족합니다. Research, VOC, Evidence를 완료하면 AI 권장을 확인할 수 있습니다.',
  'intelligence.summary.goStrong':
    '강한 GO 신호입니다. 시장, 근거, 고객 데이터가 자신 있게 진행할 수 있음을 뒷받침합니다.',
  'intelligence.summary.go':
    'GO 권장. 핵심 검증 기준을 충족하며 리스크는 관리 가능한 수준입니다.',
  'intelligence.summary.review':
    '조건부 GO — 취약한 점수 항목을 집중 보완하며 진행하세요.',
  'intelligence.summary.hold':
    'HOLD 권장. 투자 전에 해결해야 할 중요한 검증 공백이 있습니다.',
  'intelligence.summary.needVoc':
    '고객 근거가 부족합니다. VOC 수집을 최우선으로 진행하세요.',
  'intelligence.summary.needGrants':
    '정부지원 매핑이 미완료입니다. 자본 리스크를 줄이기 위해 지원 프로그램을 탐색하세요.',
  'intelligence.summary.needCompetitors':
    '경쟁 환경 매핑이 부족합니다. 최종 GO 결정 전에 경쟁사를 추가하세요.',
  'intelligence.summary.default':
    '검증이 진행 중입니다. 모든 카테고리에서 근거를 계속 쌓으세요.',
  'intelligence.insights.marketStrong': '강한 시장 검증 신호',
  'intelligence.insights.marketReview': '시장 규모에 대한 추가 근거가 필요합니다',
  'intelligence.insights.competitionLow': '경쟁 압력은 관리 가능해 보입니다',
  'intelligence.insights.competitionReview': '경쟁 점수 개선이 필요합니다',
  'intelligence.insights.grantFit': '정부지원 프로그램 적합도가 양호합니다',
  'intelligence.insights.pmfPossible': '제품-시장 적합 신호가 나타나고 있습니다',
  'intelligence.insights.customerRisk': '고객 확보 리스크가 여전히 높습니다',
  'intelligence.insights.vcInterest': 'VC 관심 지표가 상승하고 있습니다',
  'intelligence.reasoning.market': '시장 규모',
  'intelligence.reasoning.competition': '경쟁',
  'intelligence.reasoning.execution': '실행',
  'intelligence.reasoning.funding': '투자 준비도',
  'intelligence.evidence.summary.strong':
    '현재 시장 근거가 검증 의사결정을 뒷받침하기에 충분합니다.',
  'intelligence.evidence.summary.moderate':
    '근거 기반이 성장 중이지만 고신뢰도 출처를 확대해야 합니다.',
  'intelligence.evidence.summary.weak':
    '근거가 부족합니다. 시장 데이터와 업계 리포트 추가를 우선하세요.',
  'intelligence.evidence.insights.sufficient': '고신뢰도 근거가 검증 임계값을 충족합니다',
  'intelligence.evidence.insights.needMore':
    '신뢰할 수 있는 AI 분석을 위해 더 많은 근거가 필요합니다',
  'intelligence.evidence.insights.addHigh': '가설을 강화하기 위해 고신뢰도 출처를 추가하세요',
  'intelligence.evidence.insights.depth': '근거 깊이가 투자자 대화를 뒷받침합니다',
  'intelligence.evidence.insights.volume': '더 높은 신뢰도를 위해 근거 양을 늘리세요',
  'intelligence.voc.summary.strong':
    'VOC 커버리지가 충분합니다. 고객 Pain과 결제 의향이 잘 문서화되어 있습니다.',
  'intelligence.voc.summary.moderate':
    'VOC 데이터가 축적 중입니다. 문제 검증을 강화하려면 인터뷰를 계속하세요.',
  'intelligence.voc.summary.weak':
    '고객 검증을 확신하기에 VOC 커버리지가 부족합니다.',
  'intelligence.voc.insights.pain': '핵심 Pain Point가 명확히 문서화되어 있습니다',
  'intelligence.voc.insights.needPain': '핵심 고객 Pain Point를 더 문서화하세요',
  'intelligence.voc.insights.payment': '결제 의향 신호를 강화하세요',
  'intelligence.voc.insights.interviews': '인터뷰 커버리지가 검증 임계값을 충족합니다',
  'intelligence.voc.insights.needInterviews': '구조화된 고객 인터뷰를 더 진행하세요',
  'intelligence.research.summary.strong':
    '리서치 커버리지가 포괄적입니다. 핵심 검증 주제가 문서화되어 있습니다.',
  'intelligence.research.summary.moderate':
    '리서치가 진행 중입니다. 시장 가설을 강화하려면 남은 계획을 완료하세요.',
  'intelligence.research.summary.weak':
    '리서치 커버리지가 부족합니다. 시장 규모와 고객 분석부터 시작하세요.',
  'intelligence.research.insights.coverage': '리서치 계획이 핵심 검증 차원을 포함합니다',
  'intelligence.research.insights.expand': '시장, 고객, 경쟁 영역으로 리서치를 확장하세요',
  'intelligence.research.insights.competitor': '경쟁 리서치가 완료되었습니다',
  'intelligence.research.insights.needCompetitor': '경쟁사 리서치 계획을 추가하세요',
  'intelligence.research.insights.inProgress': '진행 중인 리서치 계획이 있습니다',
  'intelligence.research.insights.start': '첫 리서치 계획을 생성하세요',
  'intelligence.competitors.summary.strong':
    '경쟁 환경이 명확한 포지셔닝과 함께 잘 매핑되어 있습니다.',
  'intelligence.competitors.summary.moderate':
    '경쟁사 커버리지가 형성 중입니다. 차별화를 위해 시장 포지션을 매핑하세요.',
  'intelligence.competitors.summary.weak':
    '경쟁 분석이 부족합니다. 먼저 직접 경쟁사를 식별하세요.',
  'intelligence.competitors.insights.landscape': '직접 경쟁 환경이 문서화되어 있습니다',
  'intelligence.competitors.insights.needDirect': '경쟁 환경에 직접 경쟁사를 추가하세요',
  'intelligence.competitors.insights.positioned': '주요 플레이어의 시장 포지션이 매핑되어 있습니다',
  'intelligence.competitors.insights.mapPosition': '각 경쟁사에 시장 포지션을 할당하세요',
  'intelligence.competitors.insights.leaders': '차별화 전략을 위한 시장 리더가 식별되었습니다',
  'intelligence.competitors.insights.identifyLeaders': '카테고리 내 시장 리더를 식별하세요',
  'intelligence.competitors.categories.direct': '직접',
  'intelligence.competitors.categories.indirect': '간접',
  'intelligence.competitors.categories.substitute': '대체',
  'intelligence.competitors.categories.leaders': '시장 리더',
  'intelligence.competitors.matrix.title': '경쟁 포지셔닝 매트릭스',
  'intelligence.competitors.matrix.highThreat': '높은 위협',
  'intelligence.competitors.matrix.lowThreat': '낮은 위협',
  'intelligence.competitors.matrix.highShare': '높은 점유',
  'intelligence.competitors.matrix.lowShare': '낮은 점유',
  'intelligence.competitors.matrix.newcomer': '신규 진입',
  'intelligence.competitors.matrix.challenger': '도전자',
  'intelligence.competitors.matrix.follower': '추종자',
  'intelligence.competitors.matrix.leader': '시장 리더',
  'intelligence.competitors.matrix.unmapped': '미매핑',
  'intelligence.grants.summary.strong':
    '여러 지원 프로그램이 이 스타트업 단계에 강하게 적합합니다.',
  'intelligence.grants.summary.moderate':
    '지원 기회는 있으나 적합도 점수가 다양합니다. 자격 기준을 검토하세요.',
  'intelligence.grants.summary.weak':
    '매핑된 지원 프로그램이 없습니다. 정부 지원 옵션을 탐색하세요.',
  'intelligence.grants.insights.fit': '지원 적합도 점수와 자격을 검토하세요',
  'intelligence.grants.insights.deadlines': '임박한 마감일에 즉시 대응이 필요합니다',
  'intelligence.grants.insights.programs': '파이프라인에 지원 프로그램을 더 추가하세요',
  'intelligence.grants.insights.funding': '자금형 지원 프로그램을 이용할 수 있습니다',
  'intelligence.grants.insights.rnd': 'R&D 지원 프로그램을 검토하세요',
  'intelligence.validation.summary.empty':
    '아직 검증 점수가 없습니다. 평가를 실행하면 AI 인사이트를 확인할 수 있습니다.',
  'intelligence.validation.summary.go':
    '검증 결과 GO를 지지합니다. 투자 및 실행 준비도가 정렬되어 있습니다.',
  'intelligence.validation.summary.review':
    '조건부 검증 — 확장 전 취약 카테고리를 보완하세요.',
  'intelligence.validation.summary.hold':
    '검증 결과 상당한 리스크를 나타냅니다. 핵심 가설을 재검토하세요.',
  'intelligence.validation.insights.run': 'AI 분석을 생성하려면 Validation Score를 실행하세요',
  'intelligence.validation.insights.founder': '창업자-시장 적합이 강점입니다',
  'intelligence.validation.insights.founderReview': '창업자 적합에 대한 추가 검증이 필요합니다',
  'intelligence.reports.summary.strong':
    '검증 리포트가 이해관계자 배포 준비가 되었습니다.',
  'intelligence.reports.summary.moderate':
    '리포트 생성 중입니다. 전체 분석을 위해 생성을 완료하세요.',
  'intelligence.reports.summary.weak':
    '생성된 리포트가 없습니다. 현재 데이터로 검증 리포트를 생성하세요.',
  'intelligence.businessPlan.summary.strong': '사업계획서가 투자자 대응 준비가 되었습니다.',
  'intelligence.businessPlan.summary.moderate':
    '사업계획서 초안이 있습니다. 투자자 활용 전 다듬으세요.',
  'intelligence.businessPlan.summary.weak': '검증 데이터로 사업계획서를 생성하세요.',
  'intelligence.prd.summary.strong': 'PRD 문서가 명확한 제품 범위를 정의합니다.',
  'intelligence.prd.summary.moderate': 'PRD가 초안 상태입니다. 개발 계획 전에 완료하세요.',
  'intelligence.prd.summary.weak': '사업계획과 검증 결과로 PRD를 생성하세요.',
  'intelligence.devSpec.summary.strong': '개발 명세가 엔지니어링 인계 준비가 되었습니다.',
  'intelligence.devSpec.summary.moderate':
    '개발 명세 작성 중입니다. 아키텍처 문서를 완료하세요.',
  'intelligence.devSpec.summary.weak': 'PRD에서 개발 명세를 생성하세요.',
  'intelligence.knowledge.summary.strong': '지식 베이스가 AI 기반 질의 준비가 되었습니다.',
  'intelligence.knowledge.summary.moderate':
    '지식 처리가 진행 중입니다. 남은 문서를 완료하세요.',
  'intelligence.knowledge.summary.weak':
    'AI 분석을 위해 근거를 검색 가능한 지식으로 처리하세요.',
  'intelligence.knowledge.insights.ready': 'AI 질의에 사용할 수 있는 지식 청크가 있습니다',
  'intelligence.knowledge.insights.process': '지식 베이스 구축을 위해 근거를 처리하세요',
  'intelligence.knowledge.insights.chunks': '지식 깊이가 AI 컨설턴트를 뒷받침합니다',
  'intelligence.knowledge.insights.more':
    '더 풍부한 AI 컨텍스트를 위해 근거 출처를 추가하세요',
  'intelligence.documents.insights.ready': '문서가 검토 및 내보내기 준비가 되었습니다',
  'intelligence.documents.insights.draft': '초안 작성 중 — 생성을 완료하세요',
  'intelligence.documents.insights.generating': 'AI 생성 진행 중',
  'intelligence.documents.insights.generate': '검증 데이터에서 문서를 생성하세요',
  'intelligence.aiStudio.summary.strong':
    '문서 포트폴리오가 투자자 대응 준비가 되었습니다. 검토, 내보내기, 이해관계자 공유를 진행하세요.',
  'intelligence.aiStudio.summary.moderate':
    '핵심 문서가 있습니다. 전체 패키지를 위해 남은 AI Studio 결과물을 완료하세요.',
  'intelligence.aiStudio.summary.weak':
    '아직 AI 문서가 생성되지 않았습니다. Validation Report부터 시작하세요.',
  'intelligence.aiStudio.insights.report': '검토 가능한 검증 리포트가 있습니다',
  'intelligence.aiStudio.insights.needReport': '먼저 검증 리포트를 생성하세요',
  'intelligence.aiStudio.insights.plan': '사업계획서가 펀딩 내러티브를 뒷받침합니다',
  'intelligence.aiStudio.insights.needPlan': '아직 사업계획서가 생성되지 않았습니다',
  'intelligence.aiStudio.insights.portfolio': '다중 문서 포트폴리오가 신뢰도를 강화합니다',
  'intelligence.aiStudio.insights.start': 'Validation Report 생성부터 시작하세요',
  'intelligence.expert.insufficient':
    '확신 있는 의견을 내기에 데이터가 부족합니다. 먼저 리서치와 검증을 완료하세요.',
  'intelligence.expert.vc.label': 'VC 의견',
  'intelligence.expert.vc.positive':
    '시장 규모와 비즈니스 모델에서 투자 가능 신호가 보입니다. 단위 경제성 실사를 권장합니다.',
  'intelligence.expert.vc.neutral':
    '시장 기회는 타당하나 Series A 전 더 강한 견인력과 명확한 해자가 필요합니다.',
  'intelligence.expert.vc.negative':
    '시장 검증이 약합니다. 투자자 미팅 전 TAM 분석과 수익 모델을 재검토하세요.',
  'intelligence.expert.pm.label': 'PM 의견',
  'intelligence.expert.pm.positive':
    '문제-솔루션 적합이 VOC 데이터로 잘 뒷받침됩니다. MVP 범위를 자신 있게 좁힐 수 있습니다.',
  'intelligence.expert.pm.neutral':
    '고객 Pain은 문서화되었으나 표본 크기가 제한적입니다. 구조화된 인터뷰를 더 진행하세요.',
  'intelligence.expert.pm.negative':
    '문제 가설에 고객 근거가 부족합니다. 기능 개발 전 디스커버리를 우선하세요.',
  'intelligence.expert.cto.label': 'CTO 의견',
  'intelligence.expert.cto.positive':
    '현재 근거 기반으로 기술 실행 경로가 실현 가능합니다. 아키텍처 결정을 진행할 수 있습니다.',
  'intelligence.expert.cto.neutral':
    '핵심 기술 리스크는 식별되었으나 확장성과 연동에 대한 검증이 더 필요합니다.',
  'intelligence.expert.cto.negative':
    '실행 가능성이 불명확합니다. 기술 근거를 추가하고 MVP 아키텍처를 정의하세요.',
  'intelligence.expert.marketing.label': '마케팅 의견',
  'intelligence.expert.marketing.positive':
    '경쟁 포지셔닝이 차별화되어 있습니다. 초기 얼리어답터를 위한 GTM 내러티브를 다듬을 수 있습니다.',
  'intelligence.expert.marketing.neutral':
    '경쟁 환경은 매핑되었으나 차별화 메시지 다듬기가 필요합니다.',
  'intelligence.expert.marketing.negative':
    '시장 포지셔닝이 차별화되지 않았습니다. 경쟁 분석과 가치 제안 작업을 완료하세요.',
};

const expectedKeys = leafKeys(en.intelligence, 'intelligence');
const translationKeys = Object.keys(INTELLIGENCE_KO);

const missing = expectedKeys.filter((key) => !translationKeys.includes(key));
const extra = translationKeys.filter((key) => !expectedKeys.includes(key));

if (missing.length > 0) {
  console.error('Missing translations:', missing);
  process.exit(1);
}

if (extra.length > 0) {
  console.error('Extra translations:', extra);
  process.exit(1);
}

for (const [dotPath, value] of Object.entries(INTELLIGENCE_KO)) {
  setPath(ko, dotPath, value);
}

fs.writeFileSync(koPath, `${JSON.stringify(ko, null, 2)}\n`);
console.log(`Applied ${translationKeys.length} intelligence.* Korean translations to ko.json`);
