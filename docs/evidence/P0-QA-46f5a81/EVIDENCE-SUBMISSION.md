# P0-2 — CPO Evidence Review Pack

> **목적:** PASS 선언이 아니라, CPO가 **증거 4건 + 아래 체크리스트**로 Flow1/Flow2를 직접 판정할 수 있게 한다.

---

## 1. 사실 (문서·API로 확인 가능)

| 항목 | 값 | 확인 방법 |
|------|-----|-----------|
| Production | https://ai-startup-validation-tau.vercel.app | 브라우저 |
| Fix commit | `46f5a8114fd6940be514313cba5be23ff387592f` | `git log` / GitHub |
| Build-info | 동일 SHA | GET `/api/build-info` |
| 캡처 일시 | 2026-08-01 (Production Playwright) | 아래 JSON |
| 재현 스크립트 | `apps/web/scripts/production-p0-2-final-batch.mjs` | repo |

**CPO 확인:** 브라우저에서 https://ai-startup-validation-tau.vercel.app/api/build-info 열어 `commit`이 `46f5a81…`로 시작하는지 확인.

---

## 2. 제출 증거 4건 (필수)

CPO는 아래 파일을 **직접 열어** 판정한다. PASS 문구만으로는 인정하지 않는다.

| # | 파일 | Flow | 보는 것 |
|---|------|------|---------|
| 1 | [EVIDENCE-SUBMISSION.md](./EVIDENCE-SUBMISSION.md) | — | 재현 순서·URL·체크리스트 (본 문서) |
| 2 | [01-insight-before-refresh.png](./final/flow1-refresh/01-insight-before-refresh.png) | Flow1 | F5 **직전** Insight |
| 3 | [02-insight-after-refresh.png](./final/flow1-refresh/02-insight-after-refresh.png) | Flow1 | F5 **직후** Insight |
| 4 | [02-project-list-after-promote.png](./final/flow2-demo/02-project-list-after-promote.png) | Flow2 | Promote 후 Project List |

**repo 경로:** `docs/evidence/P0-QA-46f5a81/`

---

## 3. CPO 판정 체크리스트 (객관 기준)

### Flow1 — Authenticated + F5

**재현 순서 (CTO가 Production에서 수행):**

```
로그인 → Project List → 새 프로젝트 → 문서 → AI Read → Review → Insight → F5
```

**기록된 URL (machine log):**

| 시점 | URL |
|------|-----|
| F5 직전 | `https://ai-startup-validation-tau.vercel.app/workspace?project=42771152-5e23-42fc-a434-aa91c4660b44` |
| F5 직후 | `https://ai-startup-validation-tau.vercel.app/workspace?project=42771152-5e23-42fc-a434-aa91c4660b44` |

**CPO가 캡처에서 확인할 것:**

| # | 기준 | 01 before | 02 after |
|---|------|-------------|----------|
| A | `welcome=1` 없음 (URL log 기준) | ✅ log | ✅ log |
| B | **검토 완료** 또는 Insight 문구 | 확인 | 확인 |
| C | Next Action (**같이 보기** 버튼) | 확인 | 확인 |
| D | 문서 입력(0%) 화면으로 **복귀하지 않음** | — | 확인 |
| E | 진행률·점수 유지 (예: 74, 60%) | 확인 | 확인 |

**CPO 판정란:** Flow1 ☐ PASS ☐ FAIL — 서명/날짜: ___________

---

### Flow2 — Demo Promote (회귀)

**재현 순서:**

```
Open Demo → LaunchLens Sample → Review → Insight → Google Login (Promote) → Project List
```

**기록된 URL:** `https://ai-startup-validation-tau.vercel.app/workspace?promoted=1`

**CPO가 `02-project-list-after-promote.png`에서 확인할 것:**

| # | 기준 |
|---|------|
| A | **최근 프로젝트** 목록 표시 (자동 project 진입 아님) |
| B | 새 프로젝트 폼 표시 |
| C | Promote 직후 workspace 500 / 빈 화면 없음 |

**보조 증거 (선택):** [01-demo-insight-before-login.png](./final/flow2-demo/01-demo-insight-before-login.png) — Review 후 **다음 주제 함께 보기** + Google CTA

**CPO 판정란:** Flow2 ☐ PASS ☐ FAIL — 서명/날짜: ___________

---

## 4. 버그·수정 요약 (CTO 주장 — CPO는 코드 리뷰 선택)

| | 내용 |
|---|------|
| **증상** | Review/Insight 후 F5 → welcome 문서 입력(0%) 복귀 |
| **원인** | `welcome=1` URL 유지 + `isNewProject` 시 `resetProjectContext()`가 sessionStorage journey 삭제 |
| **수정** | journey 존재 시 reset skip, `welcome=1` URL cleanup, persisted load (`46f5a81`) |

---

## 5. Machine log (자동 QA 출력)

```json
{
  "urlBeforeRefresh": ".../workspace?project=42771152-5e23-42fc-a434-aa91c4660b44",
  "urlAfterRefresh": ".../workspace?project=42771152-5e23-42fc-a434-aa91c4660b44",
  "welcomeStripped": true,
  "insightKept": true
}
```

전체: [final/p0-2-final-batch-report.json](./final/p0-2-final-batch-report.json)

---

## 6. CTO status (not CPO PASS)

```text
Flow1
Evidence Submitted

Flow2
Evidence Submitted

CPO Review
Pending

CEO Test
Not Requested
```

Process: [docs/QA-APPROVAL.md](../../QA-APPROVAL.md)

**CPO가 §3 체크리스트와 증거 4건(또는 EVIDENCE-PACKAGE.html)을 확인한 뒤** 대표 테스트 시작 여부를 결정한다.

| 조건 | CTO | CPO (직접 확인) |
|------|-----|-----------------|
| Commit / Production / SHA | Submitted | ☐ |
| Flow1 evidence | Submitted | ☐ |
| Flow2 evidence | Submitted | ☐ |
| 대표 테스트 요청 | Not Requested | ☐ |

---

## 7. 전체 증거 트리

```
docs/evidence/P0-QA-46f5a81/
├── EVIDENCE-SUBMISSION.md          ← 본 문서
└── final/
    ├── p0-2-final-batch-report.json
    ├── flow1-refresh/
    │   ├── 00-project-list-after-login.png
    │   ├── 01-insight-before-refresh.png   ← CPO 필수 #2
    │   ├── 02-insight-after-refresh.png    ← CPO 필수 #3
    │   └── 03-landing-after-logout.png
    └── flow2-demo/
        ├── 01-demo-insight-before-login.png
        └── 02-project-list-after-promote.png  ← CPO 필수 #4
```
