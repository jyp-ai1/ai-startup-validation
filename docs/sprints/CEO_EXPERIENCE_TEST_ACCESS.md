# CEO Experience Test — Access (S13 Build)

**Gate:** Evidence SHA = Production SHA  
**Tag:** `s13-deterministic-analysis-engine-v1`  
**Release commit:** `3eeae9edb642241904d9b315cfcd86f5e8ce1954`

## Production

```text
https://ai-startup-validation-tau.vercel.app
```

## Build verify (CEO 시작 전 필수)

```text
https://ai-startup-validation-tau.vercel.app/api/build-info
```

Expected:

| Field | Value |
|-------|--------|
| `commit` | `3eeae9edb642241904d9b315cfcd86f5e8ce1954` (prefix `3eeae9e`) |
| `environment` | `production` |
| Deploy observed | `2026-08-03T15:50:16.499Z` |

`commit`가 다르면 **테스트하지 말 것** — CTO에 재확인.

## Login

```text
Primary: Google OAuth (Login)
Optional: Landing / Workspace Demo CTA
          → /workspace?from=demo&promote=1
```

비밀번호 공유 계정 없음. Google 로그인 또는 Demo CTA 사용.  
(내부 QA magic-link `cto-qa@…`는 CEO 테스트용이 아님.)

## Entry

```text
Landing
  → Login 또는 Demo
  → Workspace
  → AI PM (프로젝트 선택 / 문서·대화 루프)
```

직접 진입 후:

```text
https://ai-startup-validation-tau.vercel.app/workspace
```

## Protocol

5문항 · Feedback 분류: [`docs/sprints/CEO_EXPERIENCE_TEST_S13.md`](../../sprints/CEO_EXPERIENCE_TEST_S13.md)

## Scope note (정직한 기준)

S13 Release는 **Deterministic Analysis Engine** + Evidence Archive를 **동일 SHA**에 고정한 기준점입니다.  
S13 Scope Out에 UI/Surface 배선이 포함되어 있으므로, CEO 테스트는 이 Build에서의 **제품 경험** 검증입니다.  
동일 입력≠Decision · Evidence 없는 Insight 등은 **Architecture Bug → Hotfix**; 문장·흐름·가시성은 **Product Feedback → S14**.
