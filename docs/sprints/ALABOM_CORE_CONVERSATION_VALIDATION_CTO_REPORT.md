# ALABOM — Core Conversation Experience Validation CTO Report

```text
Status: READY FOR CPO REVIEW
Date: 2026-08-26
Sprint: ONE Long Sprint — Audit → Batch impl → Targeted QA → Journey → Transcript → CTO Report
Production: https://ai-startup-validation-tau.vercel.app
Base tip: f6338b8 (Core v3 validation) · Docs tip: 512a14f
Auth: UNTOUCHED (KI-1 HOLD)
CPO PASS: NOT CLAIMED
```

## Return summary (parent)

| Field | Value |
|-------|--------|
| **SHAs** | Base `f6338b8` · Docs `512a14f` · This sprint batch = working tree (whyNow judgment-first + i18n ban + CV dual-write) — **not yet committed** |
| **Audit root causes** | See §Audit |
| **Batch-fixed** | Judgment-first Living `whyNow`; soft-spine whyNow; Why follow-up uses Living whyNow; banned「다음 질문입니다」; A–F transcript dual-write |
| **Journey A–F paths** | `docs/evidence/ALABOM/conversation-validation/TRANSCRIPT.md` (+ `transcript-raw.json`); mirrored `docs/evidence/ALABOM/core-v3/TRANSCRIPT.md` |
| **P0 checklist** | See §P0 — engine HOLD→PASS where listed; Production LIVE re-capture optional after ship |
| **READY FOR CPO REVIEW** | **YES** |
| **CPO PASS claimed?** | **NO** |
| **Auth** | Untouched |
| **Known Issues** | `docs/evidence/ALABOM/conversation-validation/KNOWN_ISSUES.md` |

---

## Mission

Kill form-like `input → next input`. Prove Living Conversation causality for CPO:

understanding → judgment → why now → one Q → answer → processing → update → next gap → sufficiency → viability → final.

No mid Phase splits. No mid CPO PASS requests. Preserve S7/S8/S14/S16/S17.

---

## Audit (root causes)

Traced: question gen / priority · Living State · Known/Inferred/Confirmed/Unknown · provenance · confidence · answer save · whyNow · stage/sufficiency · conflict · prior edit · Demo SoT · Overview/AI PM SoT.

| # | Root cause | Where | Status after batch |
|---|------------|-------|--------------------|
| RC-1 | Wrong-slot force-merge (answer dumped into asked template) | Pre-v3 `apply` path; Live CPO tip `c485ce7` | **FIXED** in engine (`interpretAnswerSemantics` + semantic merge issue) since `5c6cb20` |
| RC-2 | Fixed Problem→Customer→Market template order | Soft diagnosis / issue order | **FIXED** — Living gap picker (`resolveMissingFieldPriorities` / `resolveNextIssueFromLivingState`) |
| RC-3 | Why / mid-summary / nonsense stored as Fact | Slot dump + quality gate holes | **FIXED** — display-only intents; nonsense non-mergeable |
| RC-4 | Generic whyNow (`문서·이전 답변으로 「field」…` / 「다음 질문입니다」) | `scoreGap` + i18n interview feedback | **FIXED this sprint** — `whyNowForGapField` + i18n ban |
| RC-5 | Conflict silent / dual-current | Memory lifecycle | **FIXED** — park CONFLICT + explicit cue `다릅니다` |
| RC-6 | Prior edit blocked on older Production tip | UI missing on `c485ce7` live pack | **FIXED** in tip `f6338b8` UI (`← 이전 답변 수정` + supersede) |
| RC-7 | Sufficiency by question count / nonsense skip | Stage gate | **FIXED** — `evaluateStageTransition` critical facts + gaps; nonsense does not resolve issue |
| RC-8 | Overview vs AI PM SoT drift | Multiple builders | **MITIGATED** — both read `buildLivingUnderstandingState` |
| RC-9 | Final analysis copy drift (B2B SaaS vs tourist spine) | Analysis presenter | **OPEN (P1)** — not in this batch |
| RC-10 | Auth durable session | KI-1 | **HOLD** — out of scope |

---

## Architecture (answer path)

```text
User answer
→ Semantic Interpretation (intent + factKey by meaning)
→ Compare Claims → New / Update / Conflict / Display-only
→ Memory write (semantic issue section only)
→ Living Understanding rebuild
→ Judgment-critical next Q + whyNow
→ Processing stages (memory → business → nextQuestion) — real pipeline, not fake AI timer
```

### Key modules

| Module | Role |
|--------|------|
| `interpret-answer-semantics.ts` | Intent + semantic routing |
| `workspace-state-update.ts` | Single write path; Why uses Living whyNow |
| `living-understanding-state.ts` | SoT + `whyNowForGapField` |
| `resolve-missing-field-priority.ts` | Gap rank + `getWhyThisQuestionNow` |
| `stage-transition.ts` | Sufficiency ≠ turn count |
| `workspace-ai-pm-loop-panel.tsx` | Why/mid · conflict · edit-prior · processing |
| `workspace-s11-surface.tsx` | UX `왜 지금 이 질문` |

---

## What was batch-fixed (this Long Sprint)

1. **Judgment-first whyNow** — field-specific Korean copy; bans empty-field template.
2. **Soft spine whyNow** — reuses `whyNowForGapField` (no English generic).
3. **Why meta follow-up** — `getWhyThisQuestionNow` Living copy, not stock boilerplate.
4. **Banned UX string** — KO/EN `nextQuestionFeedback` no longer 「다음 질문입니다」 / 「Next question.」
5. **Journeys A–F dual-write** — `conversation-validation/` + refreshed `core-v3/` transcripts.
6. **Unit assertions** — whyNow must not match banned patterns.

Inherited from Core v3 (still in force): semantic routing, conflict park, edit-prior supersede, sufficiency gate, AC-2 causality tests.

---

## Product Journey (A–F)

| Journey | Intent | Engine status | Transcript evidence |
|---------|--------|---------------|---------------------|
| **A** | New min seed → 8–10 turns | PASS (engine) | T1–T10 |
| **B** | Document/PDF — no re-ask known | PASS (engine) | Journey 2 / B section |
| **C** | Answer → Living update + next Q change | PASS (engine) | T2 payer→buyer; next ≠ slot |
| **D** | Why — never Fact | PASS | T5 `why_meta` |
| **E** | Edit prior + supersede + recompute | PASS (engine) | Journey 5 / E |
| **F** | Competition → differentiation → strategy/conflict | PASS (engine) | T7 competitor · T10 conflict |

Full turn-by-turn: `docs/evidence/ALABOM/conversation-validation/TRANSCRIPT.md`

---

## P0 Acceptance checklist

| P0 | Status | Notes |
|----|--------|-------|
| New min seed → AI understanding | **PASS (engine)** | One-liner seed Living claims |
| Doc no re-ask known | **PASS (engine)** | Journey B first ask = gap |
| Answer → Living update + next Q change | **PASS (engine)** | AC-2 unit + T2 |
| Real whyNow (not generic) | **PASS (engine)** this batch | Judgment-first copy |
| Why/nonsense never Fact | **PASS (engine)** | T5/T6 |
| Conflict explicit | **PASS (engine)** | T10 + cue |
| Prior edit + supersede + downstream | **PASS (engine+UI tip)** | Journey E |
| AI PM / Overview same SoT | **PASS (engine)** | Living SoT |
| Mid review-on-demand | **PASS (engine)** | mid_judgment display-only |
| Specificity % | **PASS (engine)** | `구체화도` in judgment |
| No fixed Q order / no repeat | **PASS (engine)** | AC-5 sequence ≠ template |
| Sufficiency → result not Q count | **PASS (engine)** | stage-transition |

---

## Processing / Edit / Conflict / Document / Sufficiency / Final

| Area | Evidence |
|------|----------|
| **Processing** | `runLoopAnswerProcessing` completes real stages; UI `reanalyze` waits on pipeline stages (not setTimeout-as-AI) |
| **Edit** | `supersedeTurnAndInvalidateDownstream` + fact clear + memory rebuild |
| **Conflict** | Park + UI choose keep_prior / accept_new |
| **Document** | Semantic section merge; document-known fields skip re-ask |
| **Sufficiency** | Critical facts + evidence + gap count — not turn count |
| **Final** | `buildConversationalFinalOutput` from Living; Hero CTA 1 on complete surface |

---

## Regression

| Suite | Result |
|-------|--------|
| `core-v3-conversation-engine.test.ts` | **13 PASS** |
| `core-v3-transcript-writer.test.ts` | **3 PASS** (A–F dual-write) |
| `living-understanding-state.test.ts` | **5 PASS** (incl. whyNow judgment-first) |
| Auth | **Not re-validated** (HOLD) |
| S7/S8/S14/S16/S17 | **Preserved** — no contract/order rewrites |

---

## Remaining Risks

1. **Working tree not on Production** until commit/push — tip `f6338b8` has causality; judgment-first whyNow polish needs ship for LIVE UI parity.
2. **RC-9** Final analysis narrative can still drift from journey spine (P1).
3. **Differentiation as separate gap** after competitor may still share `competitor_analysis` issue id — conversational sequencing OK; finer slot split is P1.
4. **Interview founder-action** i18n still uses ordinal question chrome (separate surface; Living loop uses whyNow purpose).
5. **KI-1 Auth** remains HOLD.

---

## Evidence index

- `docs/evidence/ALABOM/conversation-validation/` — this sprint pack
- `docs/evidence/ALABOM/core-v3/` — extended twin
- Prior Live CPO observations (pre-fix tip): `docs/evidence/ALABOM/core-v2/cpo-live-journey/` (not a re-run)

---

## Explicit non-claims

- Does **not** claim CPO PASS.
- Claims **READY FOR CPO REVIEW** only.
- No CEO Walkthrough until CPO PASS.
- Auth untouched.
