# P0 Hotfix Report — alpha-v2.0.7-hotfix

**Priority:** 🔴 P0 Critical  
**Version:** Alpha 2.0.7-hotfix

---

## Hotfix Summary

Goal 선택 후 무한 로딩으로 Journey 체험이 불가능했던 **P0 버그**를 수정했습니다.  
Landing 메시지를 **AI Strategy Workspace** 방향으로 정렬하고, Overlay에 **10초 타임아웃 + Retry** 및 **진행률(%)** 표시를 추가했습니다.

---

## 원인

### Primary (무한 로딩)

`WorkflowComposeLoader`의 `runCompose`가 **`analytics` 객체를 useCallback 의존성**에 포함 → 매 렌더마다 `useEffect` cleanup이 compose 타이머를 취소 → **`router.replace('/workflow')`가 영원히 실행되지 않음**.

### Secondary (Goal 단계)

Hidden form + server `redirect` 패턴은 실패 시 Overlay가 **타임아웃/Retry 없이** 고착될 수 있었음.

---

## 수정 파일

| File | Change |
|------|--------|
| `workflow-compose-loader.tsx` | analytics ref 분리, 10s timeout, compose 2s |
| `goal-selection-view.tsx` | `saveGoalAction` + client `router.push`, 10s timeout, retry |
| `journey-actions.ts` | `saveGoalAction` (cookies only, no redirect) |
| `ai-thinking-overlay.tsx` | progress %, eta hint, building message |
| `use-submit-lock.ts` | `resetLock` for retry |
| `landing-hero.tsx` / `ko.json` / `en.json` | Hero + How it Works copy |
| `landing-page.tsx` | Consultant demo/trusted/built-for 제거, MVP shorten |
| `beta-config.ts` | Alpha 2.0.7-hotfix |

---

## QA 결과

| Test | Result |
|------|--------|
| Build / Lint / Type | ✅ PASS |
| Goal → Workflow path (logic) | ✅ Fixed (timer no longer resets) |
| 10s timeout + Retry UI | ✅ Added (Goal + Compose) |
| Double-click lock | ✅ Cards disabled via `useSubmitLock` |
| simulateFail + Retry | ✅ Existing path preserved |
| Landing → Goal → Workflow → Workspace | ✅ Smoke path intact |

**Manual prod verification recommended** after deploy.

---

## Known Issue

- Performance 95 gate — unchanged (Epic 4 Phase 2)
- Epic 5 — paused until this hotfix PASS on Production

---

## Commit

`fix(web): P0 hotfix Goal→Workflow infinite loading` (pending hash on push)

---

## Preview / Production

**Production:** https://ai-startup-validation-tau.vercel.app

---

## Tag

**`alpha-v2.0.7-hotfix`**
