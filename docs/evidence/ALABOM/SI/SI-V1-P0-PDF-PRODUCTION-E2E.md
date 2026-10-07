# P0 PDF Ingestion — Production E2E

**Git / Production SHA:** `0638f77a12326c7813fefa532e035a966e733810`  
**PR #115:** MERGED → `main` (base `main @ 1690cbf`, fast-forward)  
**URL:** https://ai-startup-validation-tau.vercel.app  
**Measured:** 2026-10-07T08:54:20Z

SHA Triangle **MATCH**. CEO Founder Test **not opened**.

## Production extract

```text
POST /api/intake/extract-document
RIDM / LMULM / 주인집
→ 422 parse_failed
detail: Setting up fake worker failed:
  Cannot find module
  /var/task/node_modules/.pnpm/pdf-parse@2.4.5/node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs
```

DOMMatrix는 해소됨. Vercel lambda가 `pdf.worker.mjs`를 트레이스하지 못함.

| PDF | HTTP | Result |
|---|---|---|
| RIDM | 422 | FAIL |
| LMULM | 422 | FAIL |
| 주인집 | 422 | FAIL |

## Follow-up (intake only)

`PDFParse.setWorker(file URL)` + `outputFileTracingIncludes` for the CJS worker.  
Analyzer / S.I. / Question / SoT / Auth unchanged.
