# S15 Progress

**Sprint theme:** Decision Fatigue → Guided Validation  
**Phase:** Release for CEO self-verify (CPO absent)  
**CEO Test:** Preview + Production URLs after this ship

## Rules (locked)

1. AI는 **같이 이해하는** 시스템  
2. AI는 **다음 행동을 알려주는** 시스템  
3. Hero Action은 **항상 1개**  
4. 사용자 모델: **현재 → 왜 → 다음**

## Done (user-flow)

### P0-1 Upload
- Demo: PDF placeholder 업로드 허용 → Workspace Trust Block → Loop
- 파일명(`plan.pdf`)이 사업명이 되면 FAIL (unit PASS)
- Soft hint: 본문 미추출 시 Trust로 이어짐 안내

### P0-2 검토 시작
- 비활성 시 **항상 이유 1줄** (무반응 금지 + generic fallback)
- Memory: Loop turn을 Memory rebuild **전에** append → `problem` bag sync 수정 (unit PASS)

### P0-3 신규 프로젝트
- Create 시 8자 description 강제 **삭제**
- 설명 optional → 빈 Workspace 생성 가능

### P0-4 / P0-5 Analysis Presenter
- 화면: **현재 판단 → 근거(≤3) → 지금 해야 할 일(Hero CTA 1) → 더 보기**
- Score panel Supporting + Analysis 있을 때 2nd Hero CTA 숨김

## Internal QA

Report: `docs/sprints/S15_QA_REPORT.md`  
Evidence: `docs/evidence/S15/qa/`

| QA | Result |
|----|--------|
| QA-1 신규 프로젝트 | **BLOCKED** (Cursor browser Google OAuth 미완료) |
| QA-2 PDF Trust→Loop | **PASS** |
| QA-3 Analysis 첫 스크롤 | **PASS** |
| QA-4 Hero CTA = 1 | **PASS** |
| QA-5 검토 시작/이유 | **PASS** |

## Remaining

- [x] Commit + push `65a5972`
- [x] Production Ready (`ai-startup-validation-tau.vercel.app`)
- [ ] Representative (CEO) self-verify on URLs below
- [ ] P1 Guided Step (after P0 walkthrough)

## Ship URLs (`65a5972`)

| Env | URL |
|-----|-----|
| Production | https://ai-startup-validation-tau.vercel.app |
| Production (alias) | https://ai-startup-validation-jyp-ai1s-projects.vercel.app |
| Branch / Preview alias | https://ai-startup-validation-git-main-jyp-ai1s-projects.vercel.app |
| Deployment | https://ai-startup-validation-hnh17abzs-jyp-ai1s-projects.vercel.app |

`GET /api/build-info` → `commit: 65a5972554c4ab211bde51b7a7689e2415d2ceaa`

## Blockers

- None for ship. QA-1 live create was blocked only in Agent browser OAuth; Representative can verify on Production.
