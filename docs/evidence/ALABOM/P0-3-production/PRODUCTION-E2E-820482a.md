# P0-3 Production E2E — Scenarios A + C

**Date:** 2026-10-01 UTC  
**Production URL:** https://ai-startup-validation-tau.vercel.app  
**Git SHA (health):** `820482ac3e3a68273283b90a70e0b8b9df6f7fb2`  
**Merge:** PR #49 → `main`  
**SHA match:** Git = Build = Production ✅  

## Scenario A — Demo custom (CEO path)

| Check | Result |
|-------|--------|
| `/demo/start` → custom paste (소상공인…) | ✅ |
| SmartPM literal after start | ❌ not seen |
| SmartPM after 「✓ 맞습니다」 confirm | ❌ not seen |
| Custom document retained | ✅ (no sample reseed) |

**Screenshots:** `P0-3-production/a-before-confirm.png`, `a-after-confirm.png`

## Scenario C — Loop forward (no rollback)

| Step | Result |
|------|--------|
| After confirm → first ask | ✅ `이 서비스를 가장 필요로 하는 사람은 누구인가요?` |
| Submit answer → second ask | ✅ `고객이 지금 가장 불편해하는 점은 무엇인가요?` |
| Same question rollback | ❌ not observed |

**Screenshot:** `P0-3-production/c-after-first-answer.png`

## Verdict

```text
PASS_CANDIDATE — A ✅ · C ✅ · SHA ✅
```

## Scenario B / D

- **Auth B:** not run (infra gate separate)
- **D truncation:** not judged (CPO hold)

## Reproduce

```bash
cd apps/web
EXPECTED_PRODUCTION_SHA=820482ac3e3a68273283b90a70e0b8b9df6f7fb2 \
  node scripts/production-p0-3-demo-ac.mjs
```

JSON: `docs/evidence/ALABOM/P0-3-production/PRODUCTION-P0-3-LATEST.json`
