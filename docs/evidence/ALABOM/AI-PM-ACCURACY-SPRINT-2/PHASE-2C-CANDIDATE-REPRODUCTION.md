# Phase 2-C — Minimal reproduction and adjudication of four defect candidates

Scope (CPO order): reproduce only, **no fixes**.

Reproduction set: `apps/web/features/workflow-journey/lib/business-understanding/__tests__/phase2c-candidate-repro.test.ts`. It has 6 tests. Each one states the correct behavior and is marked `it.fails` while the defect exists. All 6 currently reproduce. When a fix lands, vitest reports the matching test, and it should be switched to `it`.

Measured on the 1,365-turn replay (10 sandbox businesses + 15 development matrix businesses, 9 behaviors × 7 turns, holdout excluded), with F13 applied. F13 changed only multi-fact rows, so none of these reproductions moved.

## Summary

| # | candidate | minimal reproduction | adjudication | production-facing |
|---|---|---|---|---|
| A | unrelated answer force-closes the asked gap | 1 `buildAnswerReview` call | **AI PM defect** (and a mirrored **GT defect**) | Yes |
| B | repeated answer flagged as a contradiction | 1 call | **AI PM defect** | Yes |
| C | correction value truncated ("중소") | 1 call | **AI PM defect** | Yes (also shown in the Project Brief) |
| D | internal text leaks into the next question | 1 replay turn per form | **AI PM defect**; one form is amplified by a **harness defect** | D2 yes; D1 only on the unreadable-document path |

## A — Unrelated answer force-closes the asked gap

**A1: customer correction asked under the channel question**

- Asked gap: `marketChannel` (question "고객을 처음 만나는 채널은 어디인가요?").
- Answer: `정정합니다. 고객은 직장인·프리랜서가 아니라 중소 제조 CEO입니다.`
- Result: facts = `customer` "중소" (FACT). Verdicts: **`marketChannel` CLOSED**, `customerPersona` CLOSED. Action: `advance`.

**A2: team size and HQ asked under the channel question**

- Asked gap: `marketChannel`.
- Answer: `참고로 우리 팀은 8명이며, 본사는 판교에 있습니다.`
- Result: facts = `market` = the whole sentence (FACT). **`marketChannel` CLOSED**. Action: `advance`.

**Root cause**

- `deriveGapCompleteness` closes the asked gap when `quality === 'VALID' && mergeable`. It does not check whether any fact in the answer maps to the asked gap's slot.
- In A2 the interpretation also keys off-slot information as `market`.

**Adjudication: AI PM defect.**

- The ground truth mirrors the same defect: `closeSlot(askedGapId)` closes the asked slot on any normal answer. That is why the evaluator never flagged A, and also why GT marked the six holdout `marketChannel` rows CLOSED (see Phase 2-A, section 0).
- So A is also a GT defect. Both need the same rule: the asked gap closes only when the answer contains a claim for that slot.

**Production impact:** the AI PM skips a gap the founder never answered, and the Project Brief shows it as confirmed.

## B — Repeated answer flagged as a contradiction

Reproduction:

- Asked gap: `marketChannel`.
- Stored facts: `customer` = 직장인·프리랜서, `problem` = 할 일·일정 분산.
- Answer: `핵심 고객은 직장인·프리랜서이고, 가장 큰 문제는 할 일·일정 분산입니다.` This restates both facts unchanged.

Result:

- `contradictions` = problem, `priorValue` "할 일·일정 분산", `newValue` = the whole sentence.
- **`problemJtbd` CONTRADICTED**, action `challenge`.

Scale: 26 normal-behavior turns in the sandbox replay. It also appears as conflict questions whose two options belong to different slots, e.g. 「결제자」에 두 가지 답이 있습니다. A) 핵심 문제는 …

**Root cause**

- `answersContradict(prior, next)` (`understanding-contract.ts`) runs `extractDeclaredCustomerSegment(next)` for every fact key.
- For a stored *problem*, it therefore compares "할 일·일정 분산" with the *customer* segment "직장인·프리랜서" taken from the new answer. Token overlap is 0, so it reports a contradiction.

**Adjudication: AI PM defect.** The contradiction check compares values from different slots.

**Production impact:** a founder who repeats themselves is asked to resolve a conflict that does not exist.

## C — Correction value truncated

Reproduction:

- Asked gap: `problemJtbd`.
- Stored fact: `customer` = 직장인·프리랜서.
- Answer: `정정합니다. 고객은 직장인·프리랜서가 아니라 중소 제조 CEO입니다.`

Result: `customer` = **"중소"** (FACT). `customerPersona` CLOSED. `problemJtbd` is also CLOSED (an instance of A).

**Root cause:** in `ai-pm-correction-semantics.ts`, the accepted group of `NOT_X_BUT_Y_RE` is `[\w가-힣]+`, a single token without spaces. "중소 제조 CEO" is cut at the first space.

**Adjudication: AI PM defect.**

**Production impact:** the corrected customer is stored and shown as "중소". The Project Brief shows CLOSED values, so the founder sees it there too.

## D — Internal text leaks into the next question

**D1: unreadable-document placeholder**

- Reproduction: `sb-marketplace`, normal, turn 4. Next question: 「아직 문서에서 사업 내용을 충분히 이해하지 못했습니다」와 비슷한 역할을 이미 하는 서비스가 있나요?
- Also: `현재 이해(아직 문서에서 …)를 기준으로 다시 묻습니다 — …` (sparse, turn 1).
- Scale: 72 turns.
- Root cause: `SHARED_UNDERSTANDING_UNREADABLE_BUSINESS` is stored as the `businessOneLiner` claim value. `reframe-question.ts` then quotes claim values into question stems without excluding it.
- Condition: happens only when the stored document is below the readability gate. **8 of the 10 sandbox documents are below it** (11–21 characters on one line; the gate needs at least 40 characters or 2 lines). That is a harness defect that amplifies D1.
- Production reach: file intake rejects such documents (`project-intake-document-field.tsx`). The workspace still offers "continue" on the unreadable-document trust block (`workspace-ai-pm-loop-panel.tsx`), so D1 is reachable only for projects whose stored document is already unreadable. I have not verified this in production.

**D2: raw document text quoted as a claim, with a readable document**

- Reproduction: `sb-b2c-saas` (41 characters, readable), multi_fact, turn 2. Next question: 「B2C SaaS — 개인 생산성 앱. 타겟: 직장인. 문제…」을 가장 절실히 느끼는 사람은 누구인가요?
- Also `sb-b2b-saas`: 「B2B SaaS — 10~50명 팀 협업. 구매: 경영진, 사용: 실무자…」.
- Scale: 20 turns.
- Root cause: the living-understanding claim for `problemJtbd` / `businessOneLiner` takes the raw document line, including field labels. The question composer quotes it verbatim.
- **Adjudication: AI PM defect, production-facing** for short structured documents above the gate.

## Not done (per order)

No fixes to A–D. No changes to READY → Review, Project Brief routing, `user_id`, or auth.
