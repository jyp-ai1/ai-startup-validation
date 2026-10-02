# Phase ① — CPO Golden 8 independent 2-pass

**Updated:** 2026-10-02 UTC  
**PR:** #66  
**Status:** **OPEN** — evidence on branch; awaiting CPO independent Expected + Verdict

## Evidence files (must be readable before Phase ① CLOSE)

| File | Purpose |
|------|---------|
| `CPO-2PASS-ACCESS-MANIFEST.md` | Paths + GitHub links |
| `CPO-2PASS-REVIEW-SHEET.md` | Compact table (start here) |
| `CPO-ACCURACY-2PASS.md` | Full narrative + JSON |
| `EVAL/cpo-2pass-evidence-pack.json` | Machine rows |
| `CPO-2PASS-FILL-TEMPLATE.md` | Verdict recording format |

## CPO close checklist

1. [ ] All turns: CPO Expected written independently  
2. [ ] Divergence vs CTO Expected logged  
3. [ ] Actual vs CPO Expected → PASS/PARTIAL/FAIL  
4. [ ] Layer 1–3 failure tally (no fake %)  
5. [ ] FAIL/PARTIAL → CTO fix → Golden regression → CPO re-verify  
6. [ ] Phase ① CLOSED → then Phase ② Real Business Review  

**Production merge:** HOLD until Phase ① (+ later gates per ladder).
