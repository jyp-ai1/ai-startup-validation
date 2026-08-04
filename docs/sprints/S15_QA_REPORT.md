# S15 Internal QA Report

**Date:** 2026-08-04  
**Production Candidate:** SHA **`65a5972`**  
**Live tip at run:** `2cf4141` (docs pin on top of `65a5972`; P0 code unchanged)  
**Base URL:** https://ai-startup-validation-tau.vercel.app  
**Method:** Playwright user scenarios + Production browser spot-check  
**Artifacts:** `docs/evidence/S15/qa/` · run log `prod-qa-run.log`  
**Playwright:** 3 passed (48.3s) — `PLAYWRIGHT_BASE_URL=https://ai-startup-validation-tau.vercel.app`

| QA | Scenario | Result |
|----|----------|--------|
| QA-1 | 신규 사용자 · 설명 없이 생성 | **CONDITIONAL** |
| QA-2 | PDF Upload → Trust → Loop | **PASS** |
| QA-3 | Analysis 첫 스크롤 | **PASS** |
| QA-4 | Hero CTA = 1 | **PASS** |
| QA-5 | 검토 시작 / 이유 | **PASS** |

**Overall:** 4 PASS + 1 CONDITIONAL (QA-1 create submit requires authenticated session).

---

## Known Environment Issue (not Release Gate)

> 이전 로컬 문자열 검색 작업은 개발 환경(터미널 인코딩/`netstat`) 문제로 중단되었음. 제품 코드 및 Production 배포에는 영향 없음. 현재 Production Candidate는 **SHA `65a5972`** 기준으로 판단.

---

## QA-1 신규 사용자

**Scenario**

```
Landing → 새 프로젝트 → 설명 없이 생성 → 첫 질문 → 답변
```

**Expected**

- "8자 이상" 문구 없음
- 생성 실패 없음

**Observed**

| Check | Evidence |
|-------|----------|
| Production `/ko/my-projects` | Redirect → `/auth/login?next=/workspace` (`qa1-auth-wall.png`) |
| "8자 이상" on auth wall | **Absent** (`qa1-result.json` `hasEightChar: false`) |
| Live create (empty description) | **Not observed** — no Agent/Playwright session (`authGated: true`) |
| Shipped gate (`65a5972`) | `createMyProjectAction` — 8자 `isWorkspaceDocumentAnalyzable` gate **removed**; i18n `사업 설명 (선택)` |

**PASS / FAIL:** **CONDITIONAL**

- PASS: public surface shows no `8자 이상`; Candidate removes create gate.
- OPEN: empty-description create → first question needs logged-in session (Representative can confirm in one login walk).

**Screenshot:** `docs/evidence/S15/qa/qa1-auth-wall.png`

---

## QA-2 PDF

**Scenario**

```
Upload → Trust → Loop
```

**Expected**

- 파일명 = 사업명 ❌
- 「읽어보니」 ❌
- Loop 시작 ⭕

**Observed**

- Demo → PDF placeholder (`plan.pdf` unreadable) → Workspace Trust
- Business: `아직 문서에서 사업 내용을 충분히 이해하지 못했습니다` — **not** `plan.pdf`
- Trust: `PDF 본문을 아직 읽을 수 없습니다. 아래 질문으로 같이 정리해 주세요.`
- Soft hint on start: `파일명은 사업명이 되지 않습니다.`
- `filenameAsBusiness: false`, `overclaim: false`
- Loop CTA: `답변으로 같이 정리하기`

**PASS / FAIL:** **PASS**

**Screenshot:** `qa2-upload.png`, `qa2-workspace.png` · `qa2-result.json`

---

## QA-3 Analysis

**Scenario**

첫 스크롤에서 이해:

```
현재 판단 → 근거 → 지금 해야 할 일
```

**Observed**

Main Analysis card:

1. **현재 판단** — `RevenueValidation = Insufficient`
2. **근거** — Problem Fit 있으나 수익 구조 근거 부족
3. **지금 해야 할 일** — `수익 구조를 먼저 검증하세요.`

Score: `참고 점수 78점 — 다음 행동이 우선입니다` (Supporting)

**PASS / FAIL:** **PASS**

**Screenshot:** `qa3-analysis.png` · `qa345-result.json`

---

## QA-4 Hero

**Expected:** Hero CTA = **1**

**Observed**

- Hero button: **「수익구조 검증하기」** ×1
- `primaryCount: 1`, `heroCount: 1`

**PASS / FAIL:** **PASS**

**Screenshot:** `qa4-hero.png`

---

## QA-5 Review

**Expected:** `검토 시작` **or** blocked reason — never silent

**Observed**

- `reviewMode: "start"` — **「검토 시작」** enabled → Analysis after click

**PASS / FAIL:** **PASS**

**Screenshot:** `qa5-review.png`

---

## Gate recommendation (CTO → CPO)

| Gate | Status |
|------|--------|
| Production Candidate `65a5972` | ✅ |
| S15 P0 | ✅ |
| Internal QA | 🟨 4 PASS + QA-1 CONDITIONAL |
| CPO Final Review | 대기 (this report) |
| CEO Walkthrough | ⛔ HOLD until CPO Final |

**CPO decision points for QA-1 CONDITIONAL**

1. Accept Candidate (gate removed + no public `8자` copy) → Final PASS → open CEO Walkthrough, or  
2. Require one authenticated empty-create screenshot before Final PASS.
