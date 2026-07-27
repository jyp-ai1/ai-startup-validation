# Sprint 1.3.1 — Review Board Vocabulary

**Version:** Sprint 1.3.1  
**Owner:** CPO  
**Parent:** [SPRINT_1_3_EVIDENCE_LOOP.md](./SPRINT_1_3_EVIDENCE_LOOP.md) · ADR-024

---

## Sprint Goal

조사를 **Event**가 아닌 **Process**로 전환하고, UI 언어에서 **"결과(Result)"** 를 제거한다.

---

## Review Board — 4 questions

1. AI는 지금 무엇을 이해하고 있는가? → **AI가 현재 이해한 내용**
2. 무엇을 근거로 그렇게 생각하는가? → **이번 검토에서 확인한 내용**
3. 현재 어디까지 검토되었는가? → **검토 현황** / **현재 판단**
4. 다음으로 무엇을 확인하면 되는가? → **다음으로 확인하면 좋은 내용**

---

## UI vocabulary (user-facing)

| Use | Avoid |
|-----|-------|
| 검토 현황 | 결과 |
| AI가 현재 이해한 내용 | AI 조사 시작 |
| 이번 검토에서 확인한 내용 | 조사 결과 |
| 현재 판단 | GO / HOLD |
| 다음으로 확인하면 좋은 내용 | 보완 |
| 현재 내용으로 검토하기 | AI 조사 시작 |

---

## Evidence Strength

No scores. Show **근거 확보 현황** (🟢/⚪ + progress bar) — "우리가 함께 얼마나 검증했는가"

---

## Shipped in 1.3.1

- [x] Review Board panels (understanding · confirmed · judgment · next)
- [x] CTA: **현재 내용으로 검토하기**
- [x] Evidence strength bar
- [x] Conclusion → **검토 보드** (no "결론/결과")
- [x] Process copy on `/investigate` (검토 진행)

---

## P2

- [ ] Merge Review Board into `/my-projects/[id]` project workspace
- [ ] Real pipeline findings → confirmed section
- [ ] Post-review 🟡 strength for market/competition fields
