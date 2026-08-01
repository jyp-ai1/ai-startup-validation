# CTO → CPO Handoff (copy this entire file to CPO chat)

---

## CTO 제출

**Commit:** `46f5a8114fd6940be514313cba5be23ff387592f`  
**Production URL:** https://ai-startup-validation-tau.vercel.app  
**Build SHA:** `46f5a8114fd6940be514313cba5be23ff387592f` (verify: `/api/build-info`)  
**캡처:** 2026-08-01, Production Playwright `production-p0-2-final-batch.mjs`

### 첨부 Evidence

- [x] EVIDENCE-SUBMISSION.md (below)
- [x] Flow1 Before Refresh — `final/flow1-refresh/01-insight-before-refresh.png`
- [x] Flow1 After Refresh — `final/flow1-refresh/02-insight-after-refresh.png`
- [x] Flow2 Promote — `final/flow2-demo/02-project-list-after-promote.png`

### CTO 의견 (사실만)

1. Fix `46f5a81` pushed to `main`; `/api/build-info` commit matches.
2. Production QA script ran on live URL; exit code 0; no errors in JSON log.
3. Flow1 URL before/after F5: same project id, **no `welcome=1`** in either URL.
4. Flow2 URL after promote: `/workspace?promoted=1` (list view, not auto-open project).

**CTO는 PASS를 최종 선언하지 않음.** CPO가 아래 캡처·체크리스트로 판정.

---

## EVIDENCE-SUBMISSION.md (전문)

### Flow1 재현

```
로그인 → Project List → 새 프로젝트 → 문서 → AI Read → Review → Insight → F5
```

| 시점 | URL |
|------|-----|
| F5 직전 | `https://ai-startup-validation-tau.vercel.app/workspace?project=42771152-5e23-42fc-a434-aa91c4660b44` |
| F5 직후 | `https://ai-startup-validation-tau.vercel.app/workspace?project=42771152-5e23-42fc-a434-aa91c4660b44` |

Machine log: `welcomeStripped: true`, `insightKept: true`

### Flow2 재현

```
Open Demo → LaunchLens Sample → Review → Insight → Promote login → Project List
```

URL after promote: `https://ai-startup-validation-tau.vercel.app/workspace?promoted=1`

### 버그·수정

| | |
|---|---|
| 증상 | Review/Insight 후 F5 → welcome 문서 입력(0%) |
| 원인 | `welcome=1` + `isNewProject` → `resetProjectContext()` wipes sessionStorage |
| 수정 | journey exists → skip reset, strip welcome, load persisted state |

---

## 캡처 관측 기록 (CPO 텍스트 검토용)

### 01-insight-before-refresh.png (Flow1, F5 직전)

| 관측 | 값 |
|------|-----|
| Header project | **P0-2 Refresh Verify** |
| 화면 | 검토 완료, AI PM Insight |
| Next Action | **같이 보기** (orange), 다른 주제 선택, 직접 입력 |
| 점수 | **74 / 100** |
| Sidebar progress | **60% 완료, 3/5** |
| Sidebar steps | 창업자/사업/고객 ✅, 시장 분석 중 |
| 문서 입력(0%) | **아님** |

### 02-insight-after-refresh.png (Flow1, F5 직후)

| 관측 | 값 |
|------|-----|
| Header project | **P0-2 Refresh Verify** (동일) |
| 화면 | 검토 완료, AI PM Insight (동일) |
| Next Action | **같이 보기** (동일) |
| 점수 | **74 / 100** (동일) |
| Sidebar progress | **60% 완료, 3/5** (동일) |
| AI PM Summary | B2B SaaS, 고객 인터뷰 3건 제안 |
| 문서 입력(0%) | **아님** |

**Before vs After:** 동일 Insight 상태. F5로 welcome(0%) 복귀 **관측되지 않음**.

### 02-project-list-after-promote.png (Flow2)

| 관측 | 값 |
|------|-----|
| Greeting | 안녕하세요, cto-qa님 |
| 화면 | 새 프로젝트 폼 + **최근 프로젝트** 목록 |
| Top project | P0-2 Refresh … (방금 전) |
| 500 / blank | **아님** |
| Auto-enter project workspace | **아님** (list view) |

---

## Machine log (JSON)

```json
{
  "commit": "46f5a81",
  "productionUrl": "https://ai-startup-validation-tau.vercel.app",
  "flow1": {
    "urlBeforeRefresh": "https://ai-startup-validation-tau.vercel.app/workspace?project=42771152-5e23-42fc-a434-aa91c4660b44",
    "urlAfterRefresh": "https://ai-startup-validation-tau.vercel.app/workspace?project=42771152-5e23-42fc-a434-aa91c4660b44",
    "welcomeStripped": true,
    "insightKept": true
  },
  "flow2": {
    "urlAfterPromote": "https://ai-startup-validation-tau.vercel.app/workspace?promoted=1"
  },
  "buildInfo": {
    "commit": "46f5a8114fd6940be514313cba5be23ff387592f"
  },
  "errors": []
}
```

---

## CPO Review (CPO가 작성)

**Evidence 확인:** ☐ 완료

**Flow1**  
☐ PASS  
☐ FAIL  
**근거:**

**Flow2**  
☐ PASS  
☐ FAIL  
**근거:**

**Regression**  
☐ 없음  
☐ 있음  
**근거:**

**대표 테스트**  
☐ 시작  
☐ 보류  
**근거:**

---

## Repo paths (CEO 로컬 확인)

```
docs/evidence/P0-QA-46f5a81/
├── CPO-HANDOFF.md
├── EVIDENCE-SUBMISSION.md
└── final/
    ├── flow1-refresh/01-insight-before-refresh.png
    ├── flow1-refresh/02-insight-after-refresh.png
    └── flow2-demo/02-project-list-after-promote.png
```

GitHub: `main` branch, commits `46f5a81` (fix) + `711d9f0` (evidence PNGs)
