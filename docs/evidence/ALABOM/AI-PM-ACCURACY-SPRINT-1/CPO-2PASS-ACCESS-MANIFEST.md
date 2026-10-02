# Phase ① — CPO 2-pass evidence access manifest

**Branch:** `cursor/ai-pm-accuracy-sprint1-6423` · **Commit:** `b8e91591b799c3bdc747b8251a08d654ec0fb1b9`

## Repository paths (workspace)

- `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/CPO-ACCURACY-2PASS.md`
- `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/CPO-2PASS-REVIEW-SHEET.md`
- `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL/cpo-2pass-evidence-pack.json`
- `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL/golden-scenarios-turn-evidence.json`
- `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/CPO-2PASS-FILL-TEMPLATE.md`

## GitHub (browse on branch)

- [CPO-ACCURACY-2PASS.md](https://github.com/jyp-ai1/ai-startup-validation/blob/cursor/ai-pm-accuracy-sprint1-6423/docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/CPO-ACCURACY-2PASS.md) — Full turn narrative + JSON blocks
- [CPO-2PASS-REVIEW-SHEET.md](https://github.com/jyp-ai1/ai-startup-validation/blob/cursor/ai-pm-accuracy-sprint1-6423/docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/CPO-2PASS-REVIEW-SHEET.md) — Compact table for CPO fill
- [EVAL/cpo-2pass-evidence-pack.json](https://github.com/jyp-ai1/ai-startup-validation/blob/cursor/ai-pm-accuracy-sprint1-6423/docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL/cpo-2pass-evidence-pack.json) — Machine-readable rows
- [EVAL/golden-scenarios-turn-evidence.json](https://github.com/jyp-ai1/ai-startup-validation/blob/cursor/ai-pm-accuracy-sprint1-6423/docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL/golden-scenarios-turn-evidence.json) — CTO turn evidence
- [CPO-2PASS-FILL-TEMPLATE.md](https://github.com/jyp-ai1/ai-startup-validation/blob/cursor/ai-pm-accuracy-sprint1-6423/docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/CPO-2PASS-FILL-TEMPLATE.md) — CPO verdict copy-paste template

## Regenerate locally

```bash
cd apps/web && pnpm test:cpo-2pass-evidence
```

## Phase ① close criteria

CPO completes independent Expected + Verdict on all rows → Layer 1–3 failure tally → FAIL/PARTIAL fixes → re-run → CPO re-verify.

