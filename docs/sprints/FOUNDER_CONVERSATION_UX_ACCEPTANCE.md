# Founder Conversation UX — Acceptance Contract

**Status:** 📋 SPEC LOCKED · 구현 0 · **parent = Strategy Revalidation**  
**Do not implement until CPO decides keep/change of the question-centric journey.**  
**After:** Recovery 2 P0-2 Production Acceptance CLOSED on `1394a8d`  
**CEO test:** CLOSED until CPO opens a single final user test  
**Engine accuracy:** already gated by P0-1 / P0-2 — separate Acceptance from UX

CPO locked this contract before any UI/UX code. Sequence for the next sprint only:

```text
UX Acceptance
 → 문제 재현
 → 최소 수정
 → E2E
 → Production
```

Not: "UI 좀 개선해봐".

## Frozen until a UX FAIL is reproduced

Auth · DB schema · V3 SoT meaning · `decideNextQuestionFromReview` rewrite · Stage ③/④ · Result/PDF · Project Brief · CEO test

Engine PASS is not UX PASS. A serious break on any item below is a UX fix, not more accuracy loops.

## Founder Journey (only path under test)

```text
사업 입력
 ↓
AI가 이해한 내용
 ↓
"맞나요?"
 ↓
[네, 맞습니다] / [아니요, 수정할게요]
 ↓
현재 질문
 ↓
[답변 입력]
 ↓
[답변 반영]
 ↓
AI 이해 업데이트
 ↓
다음 질문
```

Goal: the founder never loses the path.

## Split

| Layer | What it proves | Not this sprint until UX PASS |
|-------|----------------|-------------------------------|
| Engine | `review → gapState → lastDecision → snapshot hydrate` | P0-1 / P0-2 already PASS on Production `1394a8d` |
| UX | What the founder sees and can do in one continuous conversation | These 10 items |

## Production PASS/FAIL — 10 items

Observe on https://ai-startup-validation-tau.vercel.app after CPO opens the sprint. One primary surface at a time.

| # | Founder must see / do | PASS | FAIL |
|---|------------------------|------|------|
| 1 | 지금 AI가 확인하려는 것이 1초 안에 보임 | Current confirm or question is the only dominant ask | Multiple competing asks, or the ask is below the fold / hidden in chrome |
| 2 | 답변 입력창이 항상 명확함 | One visible place to answer the current ask | Input missing, duplicated, or looking disabled while the ask is live |
| 3 | 제출 후 내가 입력한 내용이 실제 반영됨 | The just-submitted words appear as the founder’s answer / last turn | Submit succeeds visually but the words vanish or a different phrase appears |
| 4 | AI 이해와 내가 입력한 원문이 구분됨 | Source document ≠ AI interpretation on the same screen | Source clip is shown as “AI가 이해한 내용”, or interpretation is labeled as 원문 |
| 5 | `네, 맞습니다`가 엉뚱한 슬롯을 변경하지 않음 | Confirm Yes writes only the slot being confirmed (P0-1 J6) | Confirm Yes changes customer / other CLOSED or OPEN slots |
| 6 | `아니요, 수정할게요`가 실제 편집으로 연결됨 | Confirm No opens an edit of the thing just confirmed | Confirm No skips to another question or treats the correction as a new free-form slot |
| 7 | 이전 답변 수정이 실제 수정 가능 | Edit-prior replaces the prior turn on that slot | Edit CTA missing, or edit writes a new turn on a different slot |
| 8 | 수정 후 이전 값이 되살아나지 않음 | After correction, refresh / next turn keep the new value | Old inferred or prior answer returns (P0-1 J2 / J3 / J5) |
| 9 | 다음 질문이 왜 나왔는지 자연스럽게 이해됨 | The next ask follows the just-closed gap in Founder language | Next ask feels random, repeats a CLOSED slot, or jumps with no “지금 왜” |
| 10 | 화면 어디를 봐도 현재 상태가 하나로 일치함 | Question · last answer · AI 이해 · gap completeness tell the same story | Surfaces disagree (UI says customer open, evidence shows source, next Q already left) |

Serious FAIL on any one item → fix UX first. Do not add accuracy tests to paper over a lost path.

## CEO-discovered reproduction targets

These are the Production evidence to capture when CPO opens — not a UI inventory, not CEO re-test.

| CEO finding | UX item | Capture on Production `1394a8d` |
|-------------|---------|----------------------------------|
| 질문과 답변 영역이 불명확함 | 1, 2 | Which surface is the ask vs the answer at first loop prompt |
| 첫 질문에서 입력창이 없는 현상 | 2 | First ask after 맞나요? — input present or only confirm chrome |
| `아니요. 수정할게요`가 실제 편집으로 연결되지 않음 | 6 | Confirm No → does an editor open on the confirmed slot |
| `이전 답변 수정`이 실제 수정이 아님 | 7 | Edit-prior CTA → same slot replaced, or a new off-slot turn |
| AI 이해와 원문이 중복됨 | 4 | document-first / 이해 카드 vs source clip on one screen |
| 현재 사업 검토 영역이 질문 상태와 불일치 | 10 | Review panel vs lastDecision / locked ask |
| `다음`이 무엇을 하는지 불명확함 | 9 | Any 다음 / continue control vs the current ask |
| 수정 후 이전 값이 되살아남 | 8 | After correction, remount / next turn value |
| 현재 단계와 화면 내용이 서로 다른 상태를 표시함 | 10 | Stage / 사업 검토 chrome vs question · answer · AI 이해 |

CPO open order: reproduce and measure these first. Then smallest fix → E2E → Production. CPO verifies. CEO gets one final user test only.

## Out of this document

- Implementation
- Visual polish unrelated to the 10 items
- Landing redesign
- New screens or menus
- Opening CEO test

## Next CTO start condition

CPO opens the sprint. Then reproduce a FAIL on the Production Founder Journey, apply the smallest surface fix, E2E that item, ship Production. Do not start from a UI inventory.
