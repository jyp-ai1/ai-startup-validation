# Epic 2 — Product Review (Draft)

**For:** PM morning Product Review  
**Version:** Alpha v2.0.2 → v2.1.0 path  
**Date:** 2026-07-25

---

## 한 줄 요약

LaunchLens는 **"AI 보고서 생성기"에서 "Explainable AI Strategy Workspace"**로 이동했습니다. 사용자는 Goal 선택 → AI 준비 → Why/HOLD 이유 → 다음 행동까지 **한 여정**으로 경험합니다.

---

## 제품 경험 변화 (기능 목록 아님)

| Before (Epic 1 Alpha) | After (Epic 2 autonomous) |
|------------------------|-----------------------------|
| HOLD 텍스트만 | 대화형 Coach + Evidence Drawer |
| Confidence 숫자 | Rule Engine + Missing Data 진행률 + Gain 애니메이션 |
| Workflow 영문 혼재 | 한국어 통일 + AI 전략 워크스페이스 |
| Analytics 설계만 | Journey funnel 이벤트 실연결 (mock) |
| Goal 클릭 → 바로 이동 | AI Thinking Overlay + Toast + Retry |

---

## 4가지 성공 기준 (PM Constitution)

1. **"지금 AI가 내 프로젝트를 준비하고 있다"** — ✅ Goal overlay 4단계 + 로딩 메시지
2. **"왜 HOLD인지 이해된다"** — ✅ Why → Evidence → Rules → Missing → Health 패널
3. **"무엇을 해야 GO가 되는지 보인다"** — ✅ Missing Data + Future Gain
4. **"다음 행동을 AI가 먼저 안내한다"** — ✅ Coach Next Action + 대화형 톤

---

## QA Gate (Production auto-approve)

| Gate | Prod (pre-v2.0.2) | Target | Status |
|------|-------------------|--------|--------|
| Performance | 71 | 85+ | ⏳ After deploy |
| Accessibility | 96 | 95+ | ✅ |
| Build/Lint/Smoke | ✅ | PASS | ✅ |

> Preview URL Lighthouse는 Vercel SSO redirect로 왜곡됨 — **Production URL 기준 측정**.

---

## PM 결정 필요 (Epic Review)

1. **Production promote** v2.0.2 when Performance ≥85?
2. **Workspace route** `/workspace` 유지 vs rename?
3. **Epic 2 close** vs Sprint 3 (real Evidence adapter)?

---

## 다음 Epic 방향 (post-review)

- PostHog/Clarity 선택 및 session replay
- Evidence Repository adapter (Supabase seed)
- Proactive Coach copy after mock actions
- Performance: marketing layout static generation
