# P0 PDF Ingestion Hotfix

**Branch:** `cursor/p0-pdf-ingestion-e648`  
**Production baseline:** `1690cbf` **UNCHANGED**  
**PR:** https://github.com/jyp-ai1/ai-startup-validation/pull/115

CEO Founder Test는 PDF 업로드가 막혀 중단. Analyzer / Accuracy / Auth는 변경하지 않았다.

## RCA

```text
Failure Layer: Parser
```

Picker / client extension / upload API / MIME / storage는 PDF를 받았다.

Production:

```text
POST /api/intake/extract-document
file: 투자자 사업계획서_ridm_260317.pdf
→ 422 {"ok":false,"reason":"parse_failed","detail":"DOMMatrix is not defined"}
```

Next가 `pdf-parse`의 **browser** 빌드를 묶어 Node에 `DOMMatrix`가 없다.  
클라이언트가 이를 catch해서 “문서를 읽을 수 없습니다. TXT, PDF, DOCX를 사용해 주세요.”로 뭉뚱그렸다. PDF가 허용 목록에 있는데 거절된 이유다.

로컬 Node CJS `pdf-parse`는 같은 3개 PDF를 추출한다 (RIDM 9.3k · LMULM 12.9k · 주인집 4.8k chars).

## Fix

- `createRequire`로 Node `pdf-parse` 로드
- `DOMMatrix` shim (serverless)
- `serverExternalPackages`: `pdf-parse`, `pdfjs-dist`
- 종류 판별: `%PDF` magic · `application/pdf` · 확장자
- 스캔/이미지 PDF → `image_pdf` (unsupported가 아님)

## 3 PDF Gate

| Sample | Upload | Extraction | Source | S.I. Judgment | CU | DCE | Question |
|---|---|---|---|---|---|---|---|
| `투자자 사업계획서_ridm_260317.pdf` | PASS | PASS (RIDM / Float / 플로트) | PASS | PASS | PASS | PASS | PASS |
| LMULM 초기창업패키지 | PASS | PASS (LMULM / 한정판) | PASS | PASS | PASS | PASS | PASS |
| 주인집 예비관광벤처 | PASS | PASS (酒人集 / 양조) | PASS | PASS | PASS | PASS | PASS |

사업명 분기 없음. 원문 추출 → `resolveSiJourneyIntegration`.

## Regression

#104 · #107 · P0-1 · P0-2 · Accuracy Closure · Founder Journey E2E — PASS.

## Production

`1690cbf` 불변. Merge / Production deploy는 CPO 검토 후.
