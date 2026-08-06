# S17 Progress

**Sprint:** S17 Shared Understanding Loop 2.0  
**Updated:** 2026-08-06

| Stage | Status | Notes |
|-------|--------|-------|
| S17-1 Document First | ✅ | Draft + Confidence + confirm/correct; Edit seeds from AI draft |
| S17-2 SU Loop reflect | ✅ | Staged Thinking (Memory → SU → next Q); reflect copy; yellow highlight |
| S17-3 Dynamic Question Engine | ✅ | Missing-field priority boost on Shared Understanding gaps |
| S17-4 Final Confirmation | ✅ | Full understanding → ✓ 맞습니다 — 분석 시작 |

## Acceptance snapshot

| ID | Status |
|----|--------|
| P0-1 Document First | ✅ |
| P0-2 Q→A→reflect | ✅ |
| P0-3 Thinking stages | ✅ |
| P0-4 SU animation | ✅ |
| P0-5 Missing-field Q | ✅ |
| P1-1 Confidence UX | ✅ |
| P1-2 Auto-save copy | ✅ |
| P1-3 Final Review | ✅ |

## Tests

`s17-document-first.test.ts` · `s17-loop-priority.test.ts` · `workspace-state.test.ts` — **17 passed**

## Known Issues

| ID | Item |
|----|------|
| K-1 | Client PDF extraction still weak — Trust + partial draft + low confidence (empty form still forbidden) |
| K-2 | S15 Playwright specs still lag S16 confirm gate — update in Internal QA |

## Commits

| SHA | Message |
|-----|---------|
| `8580d7d` | docs(s17): Shared Understanding Loop 2.0 mission and progress |
| `94ee8d7` | feat(s17-1): Document First draft with confidence — no empty form after upload |
| `c203a2b` | feat(s17-2): staged Thinking and Shared Understanding reflect highlight |
| `a9d34a4` | feat(s17-3): missing-field priority for next AI PM question |
| `e3c4f59` | feat(s17-4): Final Review before Analysis plus Confidence and save copy |

Tip: `e3c4f59` on `main` (pushed).
