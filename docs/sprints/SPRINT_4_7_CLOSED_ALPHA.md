# Sprint 4.7 — Closed Alpha Foundation

**Status:** 🔄 IN PROGRESS (core shipped — OAuth QA manual)  
**Mission:** LaunchLens를 개발하는 것이 아니라 **운영을 시작한다.**

사용자가 들어오고, 떠나고, 다시 오는 모든 행동을 기록합니다.

---

## Priority 0

| # | Epic | Goal |
|---|------|------|
| P0-1 | Google OAuth | Landing → Demo → Login → Workspace → 저장 → 재접속 → 이어서 검토 |
| P0-2 | Workspace Persistence | 로그인 후 AI PM 아침 보고 + 어제 프로젝트 이어하기 |

## Priority 1

| # | Epic | Goal |
|---|------|------|
| P1-1 | Admin Dashboard | Product KPI, Closed Alpha Funnel, Journey Analytics, AI PM KPI |
| P1-2 | Landing Live Metrics | Admin 데이터 일부를 Landing에 노출 (Mock 허용) |
| P1-3 | Feedback | Workspace 👍/👎 → Admin inbox |

## Priority 2

| # | Epic | Goal |
|---|------|------|
| P2-1 | Investigation Schedule | 08:00 KST, 평일만 — Cron 연결 예정 |

## Priority 3

| # | Epic | Goal |
|---|------|------|
| P3-1 | Google OAuth QA | Chrome/Safari/Edge/모바일 세션 유지 — `docs/templates/OAUTH_QA_CHECKLIST.md` |

---

## Implementation map

| Layer | File |
|-------|------|
| Auth funnel | `google-sign-in-button.tsx`, `auth-complete-tracker.tsx`, `product-analytics.ts` |
| Workspace | `v2-authenticated-workspace.tsx`, `workspace/page.tsx`, `my-projects/[id]/page.tsx` |
| Analytics | `ops-store.ts`, `types.ts` |
| Admin | `admin-closed-alpha-funnel-panel.tsx`, `admin-journey-analytics-panel.tsx`, `admin-ai-pm-kpi-panel.tsx` |
| Landing | `landing-live-metrics.tsx` |
| Feedback | `alpha-feedback-widget.tsx`, `app-shell.tsx` |
| Schedule | `v2-investigation-engine.ts`, `v2-investigation-schedule-settings.tsx` |

---

## Exit criteria

### 사용자

```
로그인 → 프로젝트 생성 → 다음날 재방문 → Morning Report → AI PM과 이어서 검토
```

### 운영자 (5분)

- 어디서 이탈하는지 (Closed Alpha Funnel)
- Demo→Workspace 전환율
- 로그인 성공률
- Artifact 생성률
- 피드백 inbox

---

## Sprint 4.8 (next)

Event Taxonomy 표준화 — `landing_view`, `demo_started`, `google_login_success`, `decision_changed` 등 Mixpanel/PostHog/GA4 연동 준비.
