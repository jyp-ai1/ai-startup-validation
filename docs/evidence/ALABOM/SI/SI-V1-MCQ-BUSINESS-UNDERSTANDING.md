# AI PM — Business understanding via multiple-choice

**CPO Gate:** OPEN · Draft · Merge/Production 금지  
**Production:** `0b465226` UNCHANGED  
**Branch:** `cursor/ai-pm-mcq-understanding-e648`

## Inventory (no remake of passed P1 / #196 reports)

| Item | Reuse | New |
|---|---|---|
| Next-unknown pick | `selectAdaptiveNextGaps` / living gaps | — |
| Answer apply | `interpretAnswerSemantics` → review → living | choice → string |
| Judgment | `applyAnswerToJudgment` | impact trace |
| Confirm / unknown | existing confirm + `아직 모르겠습니다.` | 기타 / 아직 모르겠음 buttons |
| #196 P1 accuracy | Merge hold | not included |

## Behavior

1. Short summary of understood business  
2. Confirmed facts vs unverified assumptions  
3. One highest-value unknown (already selected by engine)  
4. Business-specific options from the document, not a generic MBA list  
5. Always include 기타 · 아직 모르겠음  
6. Selection submits through the existing answer pipeline  
7. Next question / remaining gap updates after apply  
8. Free text only for 기타 or confirm/contradiction  

## Tests / build

| Suite | Result |
|---|---|
| `ai-pm-mcq-business-understanding.test.ts` A–G | 7/7 PASS |
| `p0-document-understanding-loop` | PASS |
| `recovery2-p0-2-question-loop` | PASS |
| `day8d-phase-c-no-ask` | PASS |
| `day8g` G-R1 / `core-v5` competitor+diff | main 기존 실패 · 이번 변경과 무관 |
| `pnpm --filter web build` | PASS |

## Out of scope

Conversation engine rewrite · V3 SoT / Auth change · #196 extra implementation · Production deploy
