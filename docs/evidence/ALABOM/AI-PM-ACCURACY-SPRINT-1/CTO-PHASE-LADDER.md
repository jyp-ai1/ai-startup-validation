# CTO phase ladder (CPO-fixed order)

```text
① CPO Golden 8 2-pass evidence     → CLOSED (Re-verify #3 · 10/10 PASS @ 7abb071)
② Sprint 2 multi-business harness  → EVAL/multi-business-harness-report.json (OPEN)
②-A Track A Production longitudinal → PRODUCTION/real-business-review-trace.json (OPEN · auth)
③ Full conversation trace          → turn chain + final judgment chain
④ CPO Layer 1–3                    → on Golden + Real
⑤ RJ Golden A–H wire               → reasoning-judgment-golden.ts (stubs → harness)
⑥ CPO Layer 4–5
⑦ CEO TEST 1 Understanding
⑧ Fix → regression Golden + case
⑨ CPO re-verify
⑩ CEO TEST 2 → … → Final CEO TEST
```

**Commands**

| Phase | Command |
|-------|---------|
| ① | `cd apps/web && pnpm test:cpo-2pass-evidence` |
| ② harness | `pnpm test:multi-business-accuracy` |
| ②-A Production | `pnpm evidence:real-business-review` → `pnpm evidence:phase2-cpo-pack` (needs storageState) |
| Golden regression | `pnpm test:accuracy-golden` |

**Metrics:** `ACCURACY-LAYER-METRICS.md` — no fake % until CPO labels rows.
