# Review Surface — Preview SHA evidence

**PR:** https://github.com/jyp-ai1/ai-startup-validation/pull/89  
**Branch:** `cursor/founder-journey-strategy-revalidation-e648`  
**Product SHA (last product change):** `3876f69f499dc4227cf330637815e404ad8a9afd`  
**Preview-ready Git SHA:** `16fdfd6ef3c6f078ede8a4dd990094069541470f`  
**Vercel inspector (16fdfd6):** `FQ9jzf4KwEr2vJgKpDqr1Ku6mzpw`  
**Vercel inspector (3876f69):** `CrUqK7mFXiuEFziB77i7iveTZgdv`  
**Preview alias:** https://ai-startup-validation-git-cursor-found-b697fe-jyp-ai1s-projects.vercel.app  
**Deployment URL (16fdfd6):** https://ai-startup-validation-ikhdcjp1x-jyp-ai1s-projects.vercel.app  
**Captured:** 2026-10-05  
**CEO test:** CLOSED  
**Production merge/deploy:** not done  
**Preview Acceptance:** not declared — live Preview URL 1턴 is SSO-blocked for this agent

## SHA triangle

| Source | Value |
|--------|--------|
| Product SHA | `3876f69f499dc4227cf330637815e404ad8a9afd` |
| Preview-ready Git SHA | `16fdfd6ef3c6f078ede8a4dd990094069541470f` (docs/evidence only; same product as `3876f69`) |
| Vercel Preview check `16fdfd6` | SUCCESS — Deployment has completed |
| GitHub Preview deployment | `6858473473` state `success` |
| Vercel Preview check `3876f69` | SUCCESS — Deployment has completed |

Root cause of earlier Preview FAIL (`9ba56d1`–`e274bcb`): `confirmed_count` was not on `ProductAnalyticsParams`. Fixed in `3876f69` by mapping to existing `checks_passed` / `checks_total`.

## Preview URL 1턴

Unauthenticated GET of both the alias and the `16fdfd6` deployment URL returns **HTTP 302** to `https://vercel.com/sso-api?...` and the Vercel login page (`Log in to Vercel`).

Screenshot: `docs/evidence/ALABOM/review-centric-preview/03-preview-url-vercel-sso.png`

This agent has no Vercel SSO session and no `x-vercel-protection-bypass` secret. The live Preview URL 1턴 cannot be clicked here.

CPO can open the Preview URL in a logged-in Vercel browser to close Preview Acceptance.

## One-turn evidence (5 items) — SHA-matched local

Same spec: `apps/web/e2e/review-centric-surface-turn.spec.ts`  
Same product SHA: `3876f69`  
Base: `http://127.0.0.1:3001`  
Source: `docs/evidence/ALABOM/review-centric-preview/turn.json`  
Screens: `01-before-answer.png` · `02-after-answer.png`

| # | Gate | Evidence |
|---|------|----------|
| 1 | 구조화 ≠ 원문 | 사업/고객 = `문서에서 보이나 아직 검증되지 않음`. `관광객`을 검증된 고객으로 쓰지 않음 |
| 2 | 현재 판단 | `문서에서 고객 스케치는 보이지만, 그 고객이 검증되지 않았고 누가 돈을 내는지도 갈라지지 않았습니다.` |
| 3 | 불확실성 | `지금 쓰는 대안과 무엇이 다른가?` |
| 4 | 질문 이유 ↔ 질문 | 이유: `기존 대안이 확인되면 차별 판단이 달라집니다.` / 질문: `비슷한 역할을 이미 하고 있는 서비스가 있나요?` |
| 5 | 답변 후 판단 변화 | 답: `지금은 네이버 플레이스와 인스타로 홍보하고 있습니다.` → `방금 현재 쓰는 방법을 들었지만, 고객과 지불 구조는 아직 검증되지 않았습니다.` + `review-judgment-updated` |

`lastDecision.targetGapId` after the turn: `alternativesCompetitors` (engine unchanged; Review does not replace `decideNextQuestionFromReview`).

## P0-2 regression

`recovery2-p0-2-question-loop.test.ts` reconfirmed on this checkout: **5/5 PASS** (2026-10-05 12:06 UTC).

## Out of scope

기능 추가 · 질문 엔진 변경 · Production merge · CEO 테스트 · Preview Acceptance 선언
