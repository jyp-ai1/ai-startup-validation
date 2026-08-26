# ALABOM Core Experience v2 — Evidence Index

```
Production: https://ai-startup-validation-tau.vercel.app
Auth: UNTOUCHED (Demo journey only)
Feature SHA: 89e3464 (Living Understanding State SoT)
Tip at LIVE capture: 89e3464 (prod-build-info.json)
Tip now (2026-08-26 verify): c485ce7 — includes 89e3464 as ancestor
```

## Files

| Path | Content |
|------|---------|
| `prod-build-info.json` | Production tip commit at LIVE run |
| `scenarios-af-live.json` | Prior harness A–F results (reuse) |
| `CPO_JOURNEY_GUIDE.md` | CPO step-by-step for journeys A–F |
| `KNOWN_ISSUES.md` | CQ form-like / wrong-slot (KI-CQ-1) + Auth KI-1 |
| `conversation-quality/` | CPO conversation-quality transcripts + screenshots (TEST 01–06) |
| `conversation-quality/transcript-capture.json` | Raw capture turns + per-test notes |
| `media/01-document-rich.png` | Harness A → CPO E rich |
| `media/02-document-weak-pdf.png` | Harness B → CPO E weak |
| `media/03-minimal-input.png` | Harness C → CPO A |
| `media/04-nonsense-answer.png` | Harness D (quality gate reference) |
| `media/05-why-on-ask.png` | Harness E → CPO D |
| `media/06-processing-stages.png` | Harness F processing (indexed; file may be absent) |
| `media/07-understanding-update.png` | Harness F update (indexed; file may be absent) |
| `media/08-overview-board.png` | Harness F → CPO B + F |

## CPO journey map (conversational pack)

| CPO | Focus | Evidence |
|-----|-------|----------|
| A 신규 최소 | min input → 1 gap Q | media/03 |
| B 답변 Loop | answer → update | media/08 + LIVE F |
| C 수정 | edit / contradiction | Guide (no dedicated shot) |
| D Why | 왜 묻나요 / 왜? | media/05 |
| E 문서 | rich + weak | media/01 · 02 |
| F 충분성 | gap ↓ · coverage | media/08 |

Ready report: `docs/sprints/ALABOM_CORE_V2_CPO_PRODUCTION_TEST_READY.md`

Conversation quality report (CPO HOLD): `docs/sprints/ALABOM_CORE_V2_CONVERSATION_QUALITY_REPORT.md`

## Honesty

LIVE claims require Production tip ≥ `89e3464` (Living Understanding State SoT).
Current tip `c485ce7` satisfies that (ancestor check).
