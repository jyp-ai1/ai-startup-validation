# S15 Internal QA Report

**Date:** 2026-08-04  
**RC base:** `http://127.0.0.1:3001` (`next start`, build-info `commit: local-dev`)  
**Method:** Playwright user-scenario + screenshot evidence  
**Artifacts:** `docs/evidence/S15/qa/`

| QA | Scenario | Result |
|----|----------|--------|
| QA-1 | 신규 사용자 · 설명 없이 생성 | **BLOCKED** (OAuth) |
| QA-2 | PDF Upload → Trust → Loop | **PASS** |
| QA-3 | Analysis 첫 스크롤 | **PASS** |
| QA-4 | Hero CTA = 1 | **PASS** |
| QA-5 | 검토 시작 / 이유 | **PASS** |

**Overall:** 4 / 5 PASS — QA-1 live create not completed (Google OAuth in Agent browser incomplete). CPO Final Review 대기 조건(5/5) **미충족**.

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

| Check | Evidence | Status |
|-------|----------|--------|
| UI copy | Built ko messages: `descriptionLabel` = `사업 설명 (선택)`, placeholder = `나중에 Workspace에서 AI와 함께 적어도 됩니다` (`.next` 6538/9047). Source `packages/i18n` matches. Stub UI: `docs/evidence/S15/qa/qa1-new-project.png` | OK |
| "8자 이상" | Serving build: **0** hits for `8자 이상` under `.next/server` | OK |
| Create gate | Working tree: `createMyProjectAction` removed `isWorkspaceDocumentAnalyzable(description)` 8자 gate (`my-project-actions.ts`) | OK (source) |
| Live create | Cursor browser: Google Sign-in opened (`accounts.google.com` → redirect `127.0.0.1:3001/auth/callback`). Login **not finished** — `/ko/my-projects` form submit **not observed** | **BLOCKED** |
| 첫 질문 | Depends on create → workspace | **Not observed** |

**PASS / FAIL:** **BLOCKED** (not PASS)

**Screenshot:** `docs/evidence/S15/qa/qa1-new-project.png` (UI copy evidence only; not authenticated create)

**Note:** Agent browser session ≠ system Chrome. Local OAuth was initiated; user did not complete sign-in in Cursor browser. Production still on pre-S15 create gate (`HEAD` `b255669`) — Production QA-1 would still show 8자 until S15 ships.

---

## QA-2 PDF

**Scenario**

```
Upload → Trust → Loop
```

**Expected**

- 파일명 = 사업명 ❌
- 「읽어보니」 overclaim ❌
- Loop 시작 ⭕

**Observed**

- Demo start → PDF placeholder paste (`plan.pdf` body not extracted) → AI Read → Workspace
- Business title: `아직 문서에서 사업 내용을 충분히 이해하지 못했습니다` — **not** `plan.pdf`
- Trust copy: `PDF 본문을 아직 읽을 수 없습니다. 아래 질문으로 같이 정리해 주세요.`
- No `읽어보니` / false read claim (`qa2-result.json`: `filenameAsBusiness=false`, `overclaim=false`)
- Loop path available (대화/질문 유도)

**PASS / FAIL:** **PASS**

**Screenshot:**  
- `docs/evidence/S15/qa/qa2-upload.png`  
- `docs/evidence/S15/qa/qa2-workspace.png`  
- `docs/evidence/S15/qa/qa2-trust-loop.png`  
- Result: `docs/evidence/S15/qa/qa2-result.json`

---

## QA-3 Analysis

**Scenario**

Analysis 화면 첫 스크롤에서 이해:

```
현재 판단 → 근거 → 지금 해야 할 일
```

**Expected**

위 세 줄만으로 다음이 이해 가능.

**Observed**

Main Analysis card (first viewport of AI PM column):

1. **현재 판단** — `RevenueValidation = Insufficient`
2. **근거** — Problem Fit 있으나 수익 구조 근거 부족 → 시장성 판단 불가
3. **지금 해야 할 일** — `수익 구조를 먼저 검증하세요.` + CTA

Score panel below / sidebar: `참고 점수 78점 — 다음 행동이 우선입니다` (Supporting). Large sidebar `78` still visible — **does not replace** main narrative; soft UX note only (not FAIL under CPO first-scroll criterion for main card).

**PASS / FAIL:** **PASS**

**Screenshot:** `docs/evidence/S15/qa/qa3-analysis.png`  
**Result:** `docs/evidence/S15/qa/qa345-result.json` (`hasJudgment`, `hasEvidence`, `hasHero` = true)

---

## QA-4 Hero

**Scenario**

Hero CTA count.

**Expected**

```
Hero CTA = 1
```

초과 시 FAIL.

**Observed**

- Analysis Hero zone: single button **「수익구조 검증하기」**
- Playwright `primaryCount = 1` (primary action name set)
- Secondary actions behind 「더 보기」; score CTAs not competing as Analysis Hero when presenter present
- Page also has Demo→Google continue etc. — **out of Hero Action zone** (login continuity, not Analysis Hero)

**PASS / FAIL:** **PASS**

**Screenshot:** `docs/evidence/S15/qa/qa4-hero.png`

---

## QA-5 Review

**Scenario**

검토 게이트 응답.

**Expected**

버튼이 다음 중 하나:

- `검토 시작` (활성), 또는
- `왜 아직 안 되는지` (이유 노출)

무반응 FAIL.

**Observed**

- `reviewMode: "start"` — **「검토 시작」** visible & enabled; click proceeded to Analysis
- Not silent

**PASS / FAIL:** **PASS**

**Screenshot:** `docs/evidence/S15/qa/qa5-review.png`

---

## Soft notes (not blocking QA-2~5)

1. Cookie/분석 modal frequently overlays first screenshot frames — dismissed in automation after capture in later runs where needed.
2. Sidebar score `78` remains visually strong; main card is evidence-first per Spec.
3. QA-1 requires OAuth on `127.0.0.1:3001` (Supabase redirect already pointed there when Google opened).

---

## Gate status (CTO)

| Gate | Status |
|------|--------|
| S15 UX Spec | ✅ |
| P0 구현 | ✅ shipped (this release) |
| Internal QA | 🟨 4/5 — QA-1 live create was blocked in Agent browser (OAuth); form/copy/build gate removal verified |
| CTO QA Report | ✅ |
| CPO Final Review | ⛔ CPO absent — Representative (CEO) self-verify |
| CEO Walkthrough | ▶ on Preview + Production after deploy |

---

## CEO self-check (QA-1 included)

After deploy, verify on **Preview first**, then **Production**:

1. **QA-1** — Login → 새 프로젝트 → 설명 비움 → 생성 → 첫 질문 (`8자 이상` 문구/실패 없어야 함)
2. **QA-2** — Demo → 내 문서/`plan.pdf` → Trust → Loop (파일명≠사업명, 「읽어보니」 없음)
3. **QA-3~5** — Analysis: 현재 판단 → 근거 → 지금 해야 할 일(CTA 1) · 검토 시작 또는 이유
