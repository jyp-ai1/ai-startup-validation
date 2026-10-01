# ALABOM Gate 1 — Demo Architecture (STEP 2–5) · CTO 종합 보고

**Date:** 2026-10-01 UTC  
**Scope:** Demo Seed · Sample Playback · My Business Preview cap · State isolation · SmartPM structural removal  
**CEO TEST:** HOLD (CPO 2차 검수 대기)

---

## A. 구현

| 영역 | 상태 | 요약 |
|------|------|------|
| Demo Seed 3종 | ✅ | 클리닉플로우 / 동네장터알림 / 핏브릿지 — `apps/web/lib/demo/demo-seed-documents.ts`, `demo-seed-qa.ts`, `seed/index.ts` |
| Sample Playback | ✅ | V3 파이프라인으로 프레임 materialize → `applyWorkspaceSnapshotToCache` · Production UI (`WorkspaceAiPmLoopPanel`) · `DemoSamplePlaybackBar` [다음] |
| My Business Preview | ✅ | `demo-my-{sessionId}` · Preview CTA (`WorkspaceDemoLoginCta`) · Judgment/Review readOnly block |
| State isolation | ✅ | `demo-sample-{slug}` / `demo-my-{uuid}` / Production UUID · per-project custom doc key |
| SmartPM 제거 | ✅ | `demo-samples.ts` inline SmartPM 제거 · legacy `820482a` hydration guard 유지 |
| Production Scenario | 🟡 | Playback materialize는 클라이언트 첫 진입 시 1회 (캐시) — DB seed 테이블은 후속 |

---

## B. Production SHA

| | SHA |
|---|-----|
| Git (pre-push base) | `820482ac3e3a68273283b90a70e0b8b9df6f7fb2` |
| Build (local gate) | `pnpm build` PASS on Gate 1 branch |
| Production | **배포 후 이 PR merge SHA로 갱신** |

---

## C. 테스트

| 항목 | 결과 |
|------|------|
| `demo-gate1-isolation.test.ts` | PASS — projectId 분리 · legacy alias · SmartPM 미포함 · 문서 상이 |
| `p0-3-demo-hydration.test.ts` | PASS — custom canonical · clinicflow seed (saas alias) |
| Sample A/B/C browser E2E | **후속** — Playback bar + frame advance (Production smoke script 확장 예정) |
| My Business A/B | **후속** — extraction live; isolation 단위 테스트로 SmartPM 경로 차단 확인 |
| Refresh/remount | Playback frames session cache per `projectId` |

---

## D. Production Scenario Gap (STEP 1 표)

| Gap | 판정 |
|-----|------|
| Demo Sample DB rows | **별도 후속** — 현재 TS seed + runtime materialize |
| Playback vs full DB frame store | **부분 해결** — snapshot 재생 동작, DB loader 미연결 |
| My Business Preview boundary | **해결** — Judgment/Review cap |
| Single `demo-session` | **해결** — slug/session projectId |
| Auth persist Production | **미해결** — 기존 Auth gate (Gate 1 범위 외) |
| Legacy 9-step demo UI | **별도 후속** — `v2-demo-experience-data.ts` |

---

## E. 남은 리스크

1. **Playback materialize 비용** — Sample 첫 진입 시 V3 loop 시뮬레이션 (session 캐시로 완화).
2. **My Business 2-business CEO test** — CPO 2차 전 Production browser evidence 1회 권장.
3. **DB seed migration** — Supabase `demo_project*` 테이블은 STEP 2 문서 스키마대로 후속 PR.

---

**Next Autonomous Target**  
Epic ALABOM Gate 1 · Production deploy + smoke · CPO 2차 · 다음 보고 08:00 KST
