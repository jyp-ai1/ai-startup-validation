# Production 36b241e — J3 이후 질문 루프 단절 RCA

**Status:** RCA COMPLETE — product code unchanged · Production `36b241e` preserved  
**Date:** 2026-10-04  
**SHA under investigation:** `36b241e48b9a1caf75ae5c4f77cfe5356562b54d`  
**Replay:** `apps/web/features/workflow-journey/lib/business-understanding/__tests__/production-j3-question-loop-rca.test.ts`  
**Out of scope honored:** no product fix · no locator patch · no `my-last-answer` fabrication · no Production data mutation · no V3 SoT change · no new gaps · no CEO test

---

## CPO 핵심 질문

> J3 답변 이후 AI PM의 canonical next-question pipeline이 실제 Production에서 실행됐는가?

**실행됐다.** Answer → Review → Gap → Readiness → `decideNextQuestionFromReview`까지 정상 통과했고, 다음 질문은 `payer`였다.

그 직후 **정책 레이어가 유효한 Next Question을 폐기**했다. UI/hydration 문제가 아니다.

| 판정 | 결과 |
|---|---|
| A. Pipeline 정상 + UI/hydration | **기각** |
| B. Pipeline 단절 | **채택** — 단절 지점은 Review/Gap/Readiness가 아니라 `applyNoGapTermination` |
| Stage 전환 | **잘못된 early transition** — Stage A `NOT_READY` (blocker `payer=OPEN`)인데 Day 8-H 「현재 사업 검토」로 이탈 |
| J5/J6 기능 결함 | **아님** — J5/J6는 미도달. 원인은 J3 이후 질문 루프 조기 종료 |

---

## 8문 답

| # | 질문 | 답 |
|---|---|---|
| 1 | 마지막 C 답변이 DB에 저장됐는가 | **클라이언트 loop에는 저장됨.** Production DB row는 조회하지 않음(데이터 조작 금지). persist 경로 `persistWorkspaceStateDbFirst`는 `aiPmLoop.turns`(+review)를 그대로 보냄. Production smoke에서 C가 검토 화면 one-liner/rail에 보인 것은 클라이언트 스냅샷에 C가 있었다는 증거. |
| 2 | `buildAnswerReview` 결과 | `askedGapId=customerPersona`, `recommendedAction=advance`, fact `customer=C …내국인과 외국인입니다.`, verdicts `{ customerPersona: CLOSED, businessOneLiner: CLOSED }` |
| 3 | `gapState` | `{ businessOneLiner: CLOSED, customerPersona: CLOSED }` — `payer`/`problemJtbd` 키는 **맵에 없음** (never reviewed) |
| 4 | `evaluateStageReadiness` | `stageId=A_understanding`, `status=NOT_READY`, `stageAReady=false`, blocker `{ gapId: payer, reason: OPEN }`, `problemJtbd=OPEN` |
| 5 | `decideNextQuestionFromReview` | **payer 질문 반환:** `서비스 비용은 누가 지불하나요?` / `advance after customerPersona=CLOSED; target=payer` |
| 6 | 왜 `my-last-answer`가 사라졌는가 | `viewMode='review'`가 되면 loop panel이 `WorkspaceAnswerComposer`를 언마운트하고 `WorkspaceAiPmBusinessReview`만 렌더. `my-last-answer`는 composer 전용 testid. locator 결함이 아님. |
| 7 | 왜 「현재 사업 검토」로 전환됐는가 | `finishProcessing`: `resolveNextQuestionDecision() === null` 이고 `isAiPmBusinessReviewV1Active()` → `openBusinessReview()` → `viewMode='review'` |
| 8 | 정상 Stage 전환인가 | **아니오.** Stage ③ synthesis / Stage A READY가 아님. Day 8-H 조기 Business Review. |

---

## 단절 지점 (SoT)

```text
J2 수정/확정
 ↓
first ask = businessOneLiner CONFIRM   ← Production flags: No-Ask + Fix10
 ↓
confirm-yes → businessOneLiner CLOSED
 ↓
J3 A → edit → B → edit → C
 ↓
appendLoopTurnWithReview(C)            ← 실행됨
 ↓
buildAnswerReview                      ← 실행됨 (advance, customer CLOSED)
 ↓
updateGapStateFromReview               ← 실행됨 (keys: business + customer only)
 ↓
evaluateStageReadiness                 ← 실행됨 (NOT_READY, payer OPEN)
 ↓
decideNextQuestionFromReview           ← 실행됨 → payer
 ↓
applyNoAskPolicy                       ← payer는 ASK (inference 금지)
 ↓
applyNoGapTermination                  ← ★ 단절
   turns.length === 4
   hasNoAskableGap() === true   ← gaps 맵에 CLOSED 2개만 있어 false positive
   reason = no_askable_gap
   Fix10: no_askable_gap && turns>=4 → return null   (judgment-bound fallback 차단)
 ↓
resolveNextQuestionDecision = null
budgetBlock = false                    ← questionCount=1, shouldStop=false
 ↓
finishProcessing: !decision → openBusinessReview
 ↓
Question 화면 미진입 · composer 언마운트 · 「현재 사업 검토」
```

핵심 모순:

- `isGapAskable('payer') === true` (레코드 없음 = OPEN)
- `evaluateStageReadiness` blocker = `payer OPEN`
- `decideNextQuestionFromReview` = payer
- `hasNoAskableGap()`는 `Object.keys(gapState.gaps)`만 본다 → CLOSED 2개만 있으면 **true**

즉 Readiness SoT와 No-Gap SoT가 어긋난다. 질문은 만들어졌고, 그 다음 레이어가 버렸다.

관련 코드 (36b241e, 수정 없음):

- `finishProcessing` null/budget → review: `workspace-ai-pm-loop-panel.tsx` ~1261–1290, ~2539–2557
- `hasNoAskableGap` / Fix10 hard-null: `ai-pm-no-gap-termination.ts` 43–48, 113–115, 131–133
- Production flag bake: `apps/web/next.config.ts` `NODE_ENV==='production'` → `NEXT_PUBLIC_AI_PM_JUDGMENT_AGGREGATION_V1` / `NO_ASK` default `true`
- Business Review 활성 = judgment aggregation: `ai-pm-business-review-v1.ts`

---

## Production vs local E2E가 갈라진 이유

`next.config.ts`는 **production 빌드에만** judgment/no-ask 플래그를 굽는다. local `next-dev`는 V3만 켜진 채 돌 수 있다.

| | Production 36b241e | Local V3-only (E2E가 PASS한 조건) |
|---|---|---|
| First ask | businessOneLiner **CONFIRM** | businessOneLiner **OPEN** |
| confirm-yes | 존재 → 클릭됨 (smoke 1차: confirm-yes + answer-input 동시 노출) | 없음 |
| J3 A/B/C 대상 | customerPersona 한 질문 | A=business, B=problem, C=payer로 슬롯이 밀림 |
| C 이후 turnCount | **4** (confirm + A + B + C) | **3** |
| `applyNoGapTermination` | `turns>=4 && no_askable_gap` → **null** | `turns<4` → continue |
| finishProcessing | `openBusinessReview` | next question (`marketChannel`) |
| `my-last-answer` | 사라짐 | 유지 |

A/B 직후는 Production에서도 `keep_question_loop`다. **C를 넣는 순간 turnCount가 4가 되며** 종료된다. Production smoke(A→B→C 후 검토 화면)와 일치한다.

Budget(`CEO_JUDGMENT_SESSION_MAX_QUESTIONS=5`)는 원인이 아니다. C 이후 `questionCount=1`, `shouldStop=false`.

---

## `my-last-answer`는 왜 증거가 되는가

`WorkspaceAnswerComposer`는 `lastAnswer && !editingPrior && !contradiction`일 때만 `data-testid="my-last-answer"`를 그린다.

`simpleQuestionUiActive && isAiPmBusinessReviewV1Active() && viewMode==='review' && ceoJudgment`이면 패널은 composer를 **렌더하지 않는다**.

따라서 `my-last-answer` 소실은 locator flake가 아니라 **viewMode 전환의 직접 결과**다.

---

## 하지 않은 것

- 제품 코드 수정
- Playwright locator 수정 / `my-last-answer` 강제 생성
- Production 데이터 조회·변경
- V3 SoT / gap / 질문 알고리즘 수정
- Merge / 재배포 / CEO 테스트

CPO 수정 지시 반영 (PR #84, 미머지): `hasNoAskableGap`은 Canonical Stage A/B + 기록된 키를 보고, missing 키는 OPEN과 같다. `applyNoGapTermination`은 askable Canonical 결정을 hard-null 하지 않는다. Fix10 종료 목적(진짜 no-gap)은 유지한다.

---

## 재현

```bash
pnpm --filter web exec vitest run \
  features/workflow-journey/lib/business-understanding/__tests__/production-j3-question-loop-rca.test.ts
```

Replay fixture는 Production smoke와 동일한 brewery J1 source + J3 A/B/C 문구를 사용한다.
