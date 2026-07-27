# Sprint 1.3 — Evidence Loop QA

**Gate:** PASS → merge evidence loop into project workspace (P1)

---

## User Story

```text
사업 아이디어 입력
  ↓
(+ 문제/고객/MVP/가격 Accordion 입력 — optional)
  ↓
현재 AI가 이해한 정보 체크리스트
  ↓
AI 조사 시작 (항상 노출)
  ↓
조사 결과 (근거 먼저)
  ↓
AI 의견 (점수/HOLD 없음)
  ↓
추가 입력 가이드
```

---

## QA Checklist

- [ ] 아이디어만 입력해도 **AI 조사 시작** 버튼 보임
- [ ] 41% / 60% 같은 **퍼센트 없음**
- [ ] GO / HOLD **없음**
- [ ] + 문제 클릭 → 질문 + textarea **즉시 펼침**
- [ ] + 고객 / MVP / 가격 동일
- [ ] "현재 AI가 이해한 정보" 체크리스트 표시
- [ ] "현재 정보만으로도 조사…" 안내 문구 표시
- [ ] 조사 intro에 **"밤새" 없음**
- [ ] 결론: 조사 결과 → AI 의견 → 왜? → 추가 입력
- [ ] "추가 입력" → `/validation` 복귀

---

## Anti-pattern check

- [ ] AI 버튼이 선택 칩 뒤에 숨지 않음
- [ ] 칩만 토글되고 입력 안 열리는 UX 없음
- [ ] 근거 없는 점수/판정 없음

**Preview URL:**  
**Commit SHA:**  
**PM sign-off:**
