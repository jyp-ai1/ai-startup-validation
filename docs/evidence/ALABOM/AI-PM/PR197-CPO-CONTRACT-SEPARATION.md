# PR #197 — T1–T8 계약 분리 증거

CEO 결정: problem-first 엔진 변경은 **승인하지 않음**.  
CPO: 엔진 SoT 유지 · `5263e83e`는 승인 전 검토용 문서 · 1:1 기대 문구 불변.

상태 어휘: NOT STARTED · IMPLEMENTED · CTO VERIFIED · CPO VERIFIED · NEEDS FIX · NOT VERIFIED  
엔진 PASS와 UI PASS를 한 줄로 합치지 않는다. 병합·배포하지 않는다.

| 항목 | 값 |
|---|---|
| 동결 본문 | `5263e83e` |
| Track 덤프 | `PR197-CPO-T1-T8-DIVERGENCE-DUMP.json` |
| 1:1 덤프 | `PR197-CPO-FROZEN-T1-T8-DUMP.json` compared=35 exact=0 |
| 어댑터 | `__tests__/pr197-frozen-scenario-adapter.ts` 만 |
| Production | `0b465226` 불변 |

---

## 확정 계약

**A. 런타임 SoT** — Stage A `businessOneLiner → customerPersona → payer → problemJtbd`. 문서 고객/문제 있으면 one-liner skip. FIX-10 `고객 → 문제 → solution`. 고객+문제 CLOSED & payer OPEN → next=`payer`. T7 · buyer 차단 유지. `followEngine` problem-first는 재생기.

**B. 시나리오 문서** — `5263e83e`를 런타임으로 승격하지 않음. 문구 미수정. 1:1 `0/35`는 FAIL.

어댑터 비침투: 런타임 6파일에서 `pr197-frozen-scenario-adapter` 문자열 0건. `STAGE_A_REQUIRED_GAPS` 순서 단언 PASS. 엔진 SoT 파일 git diff 공집합.

---

## Track A 종료 (next=null)

공통: `noAskableGap=false`. 물을 갭이 없어서가 아님.

| ID | next=null 턴 | customer | problem | payer |
|---|---|---|---|---|
| S1 | T4 | OPEN | PARTIAL | OPEN |
| S2 | T6 | OPEN | CLOSED | OPEN |
| S3 | T4 | OPEN | PARTIAL | OPEN |
| S4 | T4 | OPEN | PARTIAL | OPEN |
| S5 | 없음 (8턴, 문구 0/8) | T2부터 CLOSED | T2부터 CLOSED | T5 CLOSED |
| S6 | T4 | CLOSED | PARTIAL | OPEN |

원인 클래스: `next_null_with_askable_gaps_after_off_slot_or_repeat_policy`.

## Track B 8턴

전원 `reachedEight=true`, `stoppedEarly=false`. 첫 질문 전부 `customerPersona`.

| ID | askedGaps |
|---|---|
| S1 | customer → problem → solution → customer → payer×4 |
| S2 | customer → problem → **payer** → alts → validation → solution → validation → revenue |
| S3 | customer → problem → solution×2 → customer → payer×3 |
| S4 | customer → problem → solution → customer → **payer**×4 |
| S5 | customer → problem → solution → **payer** → alts → diff → revenue → alts |
| S6 | customer → problem → solution → **payer** → alts → diff → revenue → alts |

고객+문제가 온슬롯으로 CLOSED이면 next=`payer` (S2 T2, S1 T4, S4 T4, S5 T3, S6 T3).

---

## 회귀 명령과 결과

```
pnpm --filter web exec vitest run pr197-frozen-t1-t8-wording.test.ts pr197-frozen-t1-t8-divergence.test.ts pr197-t7-payer-hold.test.ts pr197-login-ui-s4-routing.test.ts
→ 20 passed (엔진)

pnpm --filter web exec vitest run pr197-conversation-quality.test.ts
→ 24 passed (S1–S6 엔진 품질 · S2/S3/S5/S6 포함)

pnpm --filter web exec vitest run ai-pm-loop-v3.test.ts -t "AC16: V3-08|AC5 V3-09"
→ 2 failed
```

AC16 원문: `expected 'alternativesCompetitors' to be 'businessOneLiner'`  
AC5 원문: `expected 'alternativesCompetitors' to be 'marketChannel'`

UI 로그인 8턴 · Google OAuth 8턴 · Production 대화: **NOT VERIFIED**.

엔진 SoT 변경안: 제출하지 않음. CEO가 problem-first를 승인하지 않았고, 이번 게이트는 계약 분리로 충분하다.

---

## 병합 게이트

| 게이트 | 판정 |
|---|---|
| T6 buyer 오사용 차단 | CPO VERIFIED 유지 · 엔진 재실행 PASS |
| T7 `next=payer` | CPO VERIFIED 유지 · 엔진 재실행 PASS |
| S6/S2/S3/S5 엔진 | PASS · UI 이번 NOT VERIFIED |
| 동결 T1–T8 1:1 | FAIL 0/35 |
| AC16 / AC5 | 기존 부채 |
| Google OAuth 8턴 | NOT VERIFIED |
| Production 대화 | NOT VERIFIED |
| PR #197 전체 병합 | 승인 보류 |
