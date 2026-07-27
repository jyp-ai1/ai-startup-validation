# Sprint 2.3 — First Value Experience

**Goal:** 5분 안에 *"LaunchLens는 내 의사결정을 도와주는 AI"* 를 느끼게 한다.

**Shipped:** `819e92a` · Production: https://ai-startup-validation-tau.vercel.app/

---

## P0

| # | Item | Status |
|---|------|--------|
| 1 | Google Login — middleware session refresh | ✅ |
| 2 | Interactive Demo (`?demo=guided`) | ✅ |
| 3 | Evidence Library (browse + detail) | ✅ |
| 4 | Decision Story (narrative beats) | ✅ |
| 5 | Sticky Next Action (never disappears) | ✅ |
| 6 | Workspace Philosophy banner | ✅ |
| 7 | Review Board 3-line (learned/why/do) | ✅ |
| 8 | No dead ends — single CTA | ✅ |

---

## North Star flow

Landing → Login → Workspace → Idea → AI research → Evidence → Review → Decision → Memory → Next Action

**Sprint 3:** Mock Evidence → Real Evidence Engine (UI minimal change)

---

## QA Checklist

### P0-1 Google Login
- [ ] Landing → Google Login → Workspace 진입
- [ ] 새로고침 후 세션 유지
- [ ] 로그아웃 → 재로그인 정상

### P0-2 Interactive Demo
- [ ] Landing → "데모 시작" → `/validation?demo=guided`
- [ ] Coach: welcome → idea → review → customer change → judgment update
- [ ] 5분 안에 Thinking Loop 체험 완료

### P0-3/8 Evidence Library
- [ ] 검토 후 Evidence Library 표시
- [ ] 좌측 카테고리 (Market, Competition, …) 클릭
- [ ] 우측 상세: 데이터 → AI 해석 → 의미 → 왜 중요?

### P0-4 Decision Story
- [ ] "Decision Decision" 반복 없음
- [ ] 날짜 + 변경 내용 + ★ 변화 + 이유 서사 형태

### P0-5/9 Next Action
- [ ] Workspace 하단 Sticky Next Action 항상 표시
- [ ] 우선순위 · 시간 · 효과 · why · [시작] 버튼 1개

### P0-6 Philosophy Banner
- [ ] Workspace 상단 "Think Better. Decide Better." + 축적 상태

### P0-7 Review Board
- [ ] 오늘 알게된 것 → 왜 중요한가 → 대표가 할 것 (3줄)

### P0-10 No Dead Ends
- [ ] 모든 화면 마지막에 다음 추천 + 버튼 1개
