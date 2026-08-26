# ALABOM Core Understanding Experience — Evidence Index (01–16)

```text
Folder: docs/evidence/ALABOM/core/
Date: 2026-08-26
Production: https://ai-startup-validation-tau.vercel.app
Production tip: 7d7e9d7 (includes fa18171+)
Auth: HOLD / Deferred — not exercised
Honesty: Code merge ≠ Evidence. Unit PASS ≠ LIVE walkthrough.
```

## Artifacts

| File | Purpose |
|------|---------|
| `prod-build-info.json` | `/api/build-info` at LIVE time |
| `scenarios-af-live.json` | Playwright A–F results |
| `unit-signoff.json` | Targeted unit suite |
| `media/*.png` | LIVE screenshots |
| `KNOWN_ISSUES.md` | Auth KI-1 deferred; cookie/locale LIVE notes |

## Evidence checklist

| # | Item | Status | Proof |
|---|------|--------|-------|
| 01 | Document-rich extract | **LIVE** | `media/01-document-rich.png` · Scenario A |
| 02 | Incomplete PDF honesty | **LIVE** | `media/02-document-weak-pdf.png` · Scenario B |
| 03 | Minimal input → ask | **LIVE** | `media/03-minimal-input.png` · Scenario C |
| 04 | Nonsense answer gate | **LIVE** | `media/04-nonsense-answer.png` · Scenario D |
| 05 | Provenance labels (CEO copy) | **LIVE + UNIT** | Spine on 01/03 · i18n |
| 06 | Why on ask | **LIVE + UNIT** | `media/05-why-on-ask.png` · Scenario E · S11 purpose always on |
| 07 | Processing stages | **LIVE + UNIT** | Scenario F · Memory stage pre-marked after real write |
| 08 | Understanding update | **LIVE** | Scenario F path |
| 09 | Overview state board | **LIVE** | `media/08-overview-board.png` · Scenario F |
| 10 | Title seed / create textarea | **UNIT** | `project-intake-seed.test.ts` |
| 11 | Progress SoT ≠ stale 고객 확인 중 | **LIVE + UNIT** | lifecycle Memory/doc · Progress on 03 |
| 12 | Answer quality harden | **UNIT** | `answer-quality.test.ts` |
| 13 | Reanalyze unstuck | **UNIT + LIVE** | loop store + Scenario F processing exit |
| 14 | Demo vs Auth contract | **LIVE Demo only** | Auth HOLD |
| 15 | Brand Concept 3 intact | **LIVE** | Landing/Demo ALABOM mark in media |
| 16 | Summary/Detail provenance | **LIVE** | Spine badges on Summary |

## Counts

| Kind | Count |
|------|------:|
| LIVE (or LIVE+UNIT) | **14** |
| UNIT only | **2** (#10, #12 primary) |
| Auth LIVE | **0** (HOLD) |

Minimum Scenarios A–F: see `scenarios-af-live.json`.
