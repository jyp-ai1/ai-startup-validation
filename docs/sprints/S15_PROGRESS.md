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

- [ ] QA-1 live create (login on `127.0.0.1:3001` → empty description → first question)
- [ ] Renew Report QA-1 → PASS
- [ ] CPO Final Review
- [ ] CEO Walkthrough (only after CPO Final PASS)
- [ ] P1 Guided Step (after P0 gate)

## Blockers

- QA-1: Agent browser OAuth incomplete (session ≠ system Chrome)
