# P0-2 Final Batch — Production Evidence

**Production:** https://ai-startup-validation-tau.vercel.app  
**Commit:** `46f5a8114fd6940be514313cba5be23ff387592f`  
**Build-info:** `/api/build-info` — commit 일치 확인 (2026-08-01T01:42:53Z)  
**Captured:** 2026-08-01 Production Playwright

---

## 배포 확인

| 항목 | 값 |
|------|-----|
| Production URL | https://ai-startup-validation-tau.vercel.app |
| Git commit | `46f5a81` |
| `/api/build-info` commit | `46f5a8114fd6940be514313cba5be23ff387592f` |
| 일치 | ✅ |

---

## CTO 최종 제출

```text
Flow1
PASS

재현:
로그인 → Project List → 새 프로젝트 → 문서 → AI Read → Review → Insight → F5 → Insight 유지 → Logout → Landing

원인:
welcome=1 URL 유지 + isNewProject 시 resetProjectContext()가 sessionStorage journey 삭제

수정:
Journey 존재 시 Welcome 진입 금지 / reset skip / URL welcome=1 cleanup / persisted load

Production
Commit: 46f5a8114fd6940be514313cba5be23ff387592f

Evidence
- final/flow1-refresh/01-insight-before-refresh.png
- final/flow1-refresh/02-insight-after-refresh.png
- URL before: .../workspace?project=42771152-5e23-42fc-a434-aa91c4660b44 (welcome=1 없음)
- URL after:  .../workspace?project=42771152-5e23-42fc-a434-aa91c4660b44 (welcome=1 없음)
- final/flow1-refresh/03-landing-after-logout.png
```

```text
Flow2
PASS

Regression 없음

Evidence:
- final/flow2-demo/01-demo-insight-before-login.png (Sample → Review → Insight + Google CTA)
- final/flow2-demo/02-project-list-after-promote.png (Promote → Project List)
```

---

## Flow1 검증 상세

| 체크 | 결과 |
|------|------|
| 로그인 → Project List | ✅ `00-project-list-after-login.png` |
| welcome=1 제거 (refresh 전) | ✅ URL에 welcome 없음 |
| F5 후 Insight 유지 | ✅ `02-insight-after-refresh.png` — 검토 완료, **같이 보기**, 74점 |
| F5 후 문서 입력(0%) 복귀 없음 | ✅ |
| Next Action 유지 | ✅ 같이 보기 버튼 |
| Logout → Landing | ✅ `03-landing-after-logout.png` |

---

## Flow2 회귀 검증

| 체크 | 결과 |
|------|------|
| Demo Sample | ✅ LaunchLens Sample |
| Review → Insight | ✅ 다음 주제 함께 보기 |
| Promote → Project List | ✅ `/workspace?promoted=1` |

---

## 대표 테스트 시작 조건

| 조건 | 상태 |
|------|------|
| Flow1 PASS (F5 포함) | ✅ |
| Flow2 PASS (회귀 없음) | ✅ |

**→ CTO 검토 후 대표 테스트 요청 가능**

---

## 증거 파일

```
docs/evidence/P0-QA-46f5a81/final/
├── p0-2-final-batch-report.json
├── flow1-refresh/
│   ├── 00-project-list-after-login.png
│   ├── 01-insight-before-refresh.png
│   ├── 02-insight-after-refresh.png
│   └── 03-landing-after-logout.png
└── flow2-demo/
    ├── 01-demo-insight-before-login.png
    └── 02-project-list-after-promote.png
```

스크립트: `apps/web/scripts/production-p0-2-final-batch.mjs`
