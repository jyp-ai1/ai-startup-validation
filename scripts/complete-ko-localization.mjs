import fs from 'node:fs';
import path from 'node:path';

const messagesDir = path.join('packages', 'i18n', 'src', 'messages');
const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));
const ko = JSON.parse(fs.readFileSync(path.join(messagesDir, 'ko.json'), 'utf8'));

function merge(base, overlay) {
  const result = structuredClone(base);
  for (const key of Object.keys(overlay)) {
    if (
      overlay[key] &&
      typeof overlay[key] === 'object' &&
      !Array.isArray(overlay[key]) &&
      result[key] &&
      typeof result[key] === 'object'
    ) {
      result[key] = merge(result[key], overlay[key]);
    } else if (overlay[key] !== undefined) {
      result[key] = overlay[key];
    }
  }
  return result;
}

function setPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/** Korean UI overrides — PM terminology glossary + dashboard copy */
const KO_OVERRIDES = {
  'common.terminology.dashboard': '대시보드',
  'common.terminology.projects': '프로젝트',
  'common.terminology.strategyAnalysis': '전략 분석',
  'common.terminology.startupValidation': '스타트업 검증',
  'common.terminology.marketResearch': '시장 조사',
  'common.terminology.evidence': '근거 자료',
  'common.terminology.voc': '고객 인터뷰 (VOC)',
  'common.terminology.competitorAnalysis': '경쟁사 분석',
  'common.terminology.governmentGrants': '정부지원',
  'common.terminology.validationReport': '검증 리포트',
  'common.terminology.strategyReport': '전략 리포트',
  'common.terminology.aiConsultant': 'AI 컨설턴트',
  'common.terminology.decision': '의사결정',
  'common.terminology.investmentReadiness': '투자 준비도',
  'common.terminology.confidence': '신뢰도',
  'common.terminology.recommendedActions': '권장 조치',
  'common.view': '보기',
  'common.open': '열기',
  'common.searching': '검색 중…',
  'intelligence.aiRecommendation': 'AI 권장',
  'intelligence.executiveSummary': '경영진 요약',
  'intelligence.readinessTitle': '준비도 개요',
  'intelligence.startupReadiness': '스타트업 준비도',
  'intelligence.grade': '등급',
  'intelligence.decision': '의사결정',
  'intelligence.ranking': '순위',
  'intelligence.fundingProbability': '투자 확률',
  'intelligence.confidence': '신뢰도',
  'intelligence.confidenceMeter': '신뢰도 지표',
  'intelligence.confidenceIndex': '신뢰도 지수',
  'intelligence.actionCenter': '액션 센터',
  'intelligence.actionCenterDesc': 'Decision Engine 점수를 높이기 위한 우선순위 조치',
  'intelligence.decisionTitle': '의사결정 분석',
  'intelligence.decisionDesc': 'LaunchLens가 이 판단을 내린 이유',
  'intelligence.chartsTitle': '분석',
  'intelligence.riskHeatmap': '리스크 히트맵',
  'intelligence.scoreBreakdown': '점수 분해',
  'intelligence.topInsights': '핵심 인사이트',
  'intelligence.whyVerdict': '이 판단의 근거',
  'intelligence.growthTimeline': '성장 타임라인',
  'intelligence.dataCards': '근거 카드',
  'intelligence.rawData': '원본 데이터',
  'intelligence.evidenceSnapshot': '근거 스냅샷',
  'intelligence.riskTimeline': '리스크 및 타임라인',
  'intelligence.recentActivity': '최근 활동',
  'intelligence.expertTitle': '전문가 의견',
  'intelligence.expertDesc': '가설에 대한 다학제적 관점',
  'intelligence.detailTable': '상세 기록',
  'intelligence.readiness.startup': '스타트업 준비도',
  'intelligence.readiness.investment': '투자 준비도',
  'intelligence.readiness.grant': '지원사업 준비도',
  'intelligence.readiness.ai': 'AI 준비도',
  'intelligence.status.excellent': '우수',
  'intelligence.status.good': '양호',
  'intelligence.status.needsWork': '보완 필요',
  'intelligence.status.critical': '위험',
  'intelligence.risk.low': '낮은 리스크',
  'intelligence.risk.medium': '보통',
  'intelligence.risk.high': '높음',
  'intelligence.risk.critical': '심각',
  'intelligence.action.priority': '우선순위 {n}',
  'intelligence.action.scoreImpact': '+{points}점 영향',
  'intelligence.action.timeWeeks': '약 {weeks}주',
  'intelligence.action.timeDays': '약 3일',
  'intelligence.action.statusPending': '대기',
  'intelligence.sentiment.positive': '긍정',
  'intelligence.sentiment.neutral': '중립',
  'intelligence.sentiment.negative': '부정',
  'intelligence.categories.startup': '스타트업',
  'intelligence.categories.investment': '투자',
  'intelligence.categories.technology': '기술',
  'intelligence.categories.government': '정부지원',
  'intelligence.categories.market': '시장 조사',
  'intelligence.categories.problem': '고객 조사',
  'intelligence.categories.competition': '경쟁',
  'intelligence.categories.businessModel': '비즈니스 모델',
  'aiStudio.workspaceTitle': '문서 파이프라인',
  'aiStudio.status.generating': '생성 중…',
  'aiStudio.status.completed': '완료',
  'aiStudio.status.draft': '초안',
  'aiStudio.status.ready': '준비됨',
  'aiStudio.status.generate': '생성',
  'projectWorkspace.eyebrow': '워크스페이스 개요',
  'projectWorkspace.progressTitle': '검증 진행률',
  'projectWorkspace.modulesTitle': '인텔리전스 모듈',
  'projectWorkspace.modulesDesc': '결론 우선 — 데이터는 그 다음.',
  'projectWorkspace.viewDashboard': '커맨드 센터 열기',
  'projectWorkspace.openModule': '인텔리전스 보기',
  'voc.painDashboard.interviews': '인터뷰',
  'voc.painDashboard.highPain': '고강도 Pain',
  'voc.painDashboard.paymentIntent': '결제 의향',
  'voc.painDashboard.severityChart': 'Pain 심각도 분포',
  'voc.painDashboard.cardsTitle': '고객 Pain Point',
  'landing.eyebrow': '기업 AI 전략',
  'landing.heroTitle': '컨설팅팀처럼 전략적 의사결정 — AI가 인사이트부터 제시합니다.',
  'landing.heroSubtitle':
    'LaunchLens는 조사, 근거, 분석을 경영진급 GO / NO GO 판단으로 연결합니다. 결론 먼저, 필요할 때 데이터.',
  'landing.footerFramework': 'LaunchLens · AI Strategy Consultant',
  'enums.projectStatus.DRAFT': '초안',
  'enums.projectStatus.RESEARCHING': '리서치 중',
  'enums.projectStatus.ANALYZING': '분석 중',
  'enums.projectStatus.COMPLETED': '완료',
  'enums.projectStatus.ARCHIVED': '보관',
  'dev.localizationTitle': '다국어 테스트',
  'dev.localizationDesc': '샘플 키 {total}개 중 {missing}개 확인 필요',
  'dev.switchHint': '언어 전환 — router.refresh()로 즉시 반영됩니다',
  'dev.table.key': '키',
  'dev.table.status': '상태',
  'dev.table.ok': '정상',
  'dev.table.missing': '확인',
  'pages.newVoc': 'VOC 추가',
  'pages.newEvidence': '근거 자료 추가',
  'pages.newCompetitor': '경쟁사 추가',
  'pages.newGrant': '지원사업 추가',
  'pages.newResearch': '리서치 계획 추가',
  'pages.newValidation': 'Decision Engine 생성',
  'pages.newReport': 'Decision Report 생성',
  'pages.newBusinessPlan': 'Strategy Report 생성',
  'pages.newPrd': 'PRD 생성',
  'pages.newDevSpec': '개발 명세 생성',
  'pages.validationSummary': '검증 요약',
  'pages.grantDashboard': '지원사업 대시보드',
  'pages.projectNotFound': '프로젝트를 찾을 수 없습니다',
  'pages.newVocDesc': '새 고객 피드백 항목',
  'pages.newPrdDesc': '{project} PRD 생성',
  'settings.localizationTestLink': '다국어 테스트 페이지',
};

const merged = merge(en, ko);
for (const [dotPath, value] of Object.entries(KO_OVERRIDES)) {
  setPath(merged, dotPath, value);
}

fs.writeFileSync(path.join(messagesDir, 'ko.json'), `${JSON.stringify(merged, null, 2)}\n`);
console.log('Updated ko.json with merged keys and Korean overrides');
