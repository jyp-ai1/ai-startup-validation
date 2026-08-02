# S7 Regression Report

- Generated: 2026-08-02T07:16:53.838Z
- Base URL: http://localhost:3001

| Scenario | Result | Detail |
|----------|--------|--------|
| 0-preflight | PASS | Dev server reachable (http://localhost:3001) |
| reg1-placeholder-pdf | FAIL | locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('textarea').first()
 |
| reg2-loop-state-sync | FAIL | locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#ai-pm-loop textarea').first()
 |
| reg3-review-contract | FAIL | disabled=false, reasonVisible=false |
| reg4-pause-resume | FAIL | Loop state lost on reload |
| reg5-demo-fresh-switch | PASS | tasteLoaded=true, tasteBleed=false, mfgLoaded=true |
| reg6-full-path-smoke | FAIL | turns=0, reviewSurface=false |
