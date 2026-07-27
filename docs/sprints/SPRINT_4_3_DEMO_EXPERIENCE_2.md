# Sprint 4.3 — Demo Experience 2.0

**Status:** 🔄 IN PROGRESS  
**Sprint type:** Product validation — **Demo가 기능 튜토리얼이 아니라 AI PM 운영 경험**  
**Approver:** CPO (2026-07-27)

---

## CPO diagnosis

| Current Demo | Target Demo |
|--------------|-------------|
| 아이디어 입력 → 검토 → 결과 | AI PM이 일한다 → 대표가 판단 → AI PM이 계속 관리 |
| "LaunchLens가 이런 기능도 있고…" | "AI PM이 내 사업을 계속 관리해주는구나" |
| 사용자: *"그래서?"* | 사용자: *"아…"* |

**North Star:** Demo = LaunchLens 북극성을 보여주는 경험

---

## Mission

> Demo는 **기능 체험이 아니라 제품의 가치를 체험**한다.

성공 기준: *"AI가 분석해줬다"* ❌ → *"내 사업을 함께 운영해줄 AI PM이 생겼다"* ✅

---

## Demo flow (9 steps)

```
AI PM 인사 → 샘플 프로젝트 선택 → AI 조사 → Inbox
→ AI 의견 → Evidence(근거+해석) → 변화 감지
→ Before/After 전략 개선 → 지속 관리 안내 → Google Login CTA
```

| Step | User action | Value delivered |
|------|-------------|-----------------|
| 1 Greeting | AI 회의 시작 | AI PM persona |
| 2 Sample project | 이 프로젝트로 체험 | No typing — SaaS sample |
| 3 Investigating | (auto 3s) | AI works first |
| 4 Inbox | AI PM 의견 보기 | Completed work checklist |
| 5 Opinion | 왜 그렇게 생각했나요? | PM judgment, not dashboard |
| 6 Evidence | 다음 | Data → interpretation → impact |
| 7 Change detected | 차별 전략 검토 | Signature: AI alerts first |
| 8 Strategy improvement | 계속 | Before/After stars + positioning |
| 9 Continuous mgmt | 내 프로젝트 시작 | SaaS loop — never ends |
| 10 CTA | Google Login | Real project start |

---

## P0 deliverables

| # | Item | Status |
|---|------|--------|
| P0-2.1 | Sample project (LaunchLens) — select only | ✅ |
| P0-2.2 | 9-step consulting scenario | ✅ |
| P0-2.3 | Evidence as decision rationale | ✅ |
| P0-2.4 | Change detection mid-demo | ✅ |
| P0-2.5 | Before/After strategy metrics | ✅ |
| P0-2.6 | Continuous management closing | ✅ |

---

## Implementation map

| Layer | File |
|-------|------|
| Step types | `lib/v2-demo-experience-types.ts` |
| Sample data | `lib/v2-demo-experience-data.ts` |
| Demo UI | `components/v2/v2-demo-experience.tsx` |
| Route wiring | `v2-strategy-workspace.tsx` (`mode=demo-guided`) |
| i18n | `ia.thinkingUx.demoExperienceV2` (ko/en) |

---

## CPO acceptance criteria

After demo, user understands:

1. **AI PM monitors market & competition continuously**
2. **When change happens, AI PM alerts first and proposes re-review**
3. **LaunchLens = Thinking Workspace, not one-shot report tool**

---

## Out of scope

- Real Evidence Engine API in demo (mock copy only)
- LLM conversation in demo
- Replacing `demo-readonly` mode

---

## Entry URL

`/validation?demo=guided` (landing CTAs unchanged)
