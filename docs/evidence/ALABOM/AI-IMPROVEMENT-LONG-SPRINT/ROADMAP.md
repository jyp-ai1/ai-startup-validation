# ALABOM — AI PM Intelligence Long Sprint (CTO roadmap)

**Mode:** Autonomous sub-sprints → single **AI Long Sprint Completion Report** → CPO one-pass validation → CEO test.

## Product Completion (LS-1)

1. Authenticated full journey browser E2E  
2. Auth persistence (snapshot round-trip on reload)  
3. Document extraction (PDF/DOCX, long text, no sample fallback)  
4. Demo playback duplicate frame fix  
5. Full regression + Production SHA match  

## AI tracks (LS-2 … LS-5)

| Track | Phases | Goal |
|-------|--------|------|
| LS-2 Understanding | Evidence, Grounding, Slot, Correction, Long doc | AI understands CEO business accurately |
| LS-3 Reasoning | Gap class, Question priority, Adaptive A→B→A | AI finds what to ask next |
| LS-4 Judgment | Evidence-based judgment, validation action | AI explains why + next validation |
| LS-5 Evaluation | 20–30 scenarios, harness, scorecard (internal) | Measurable AI quality |

**V3 SoT frozen:** `buildAnswerReview` → `gapState` → `evaluateStageReadiness` → `decideNextQuestionFromReview` → CEO surfaces.

**Stop:** V3 contract change, destructive DB, auth restructure, production P0, structural blocker.
