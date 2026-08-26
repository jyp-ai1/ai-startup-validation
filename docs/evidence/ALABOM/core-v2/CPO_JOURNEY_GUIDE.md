# ALABOM Core v2 — CPO Journey Guide (Production Demo)

```
Production: https://ai-startup-validation-tau.vercel.app
Entry: /demo/start (or /demo/enter → 307 → /demo/start)
Auth: NOT required — Demo only
SHA feature: 89e3464 (Living Understanding SoT)
Tip now: c485ce7 (includes 89e3464)
Code Change for this pack: NONE
```

Goal: manually judge **conversational quality** (understanding, judgment, gap, why) — not button PASS.

Before every journey: dismiss cookie dialog (수락 / 거부 / Accept / Reject) if it covers CTAs.

---

## Shared start (all journeys)

1. Open https://ai-startup-validation-tau.vercel.app/demo/start
2. Click **내 사업 문서로 체험하기**
3. Paste text into the textarea (not project-name-only)
4. Click **AI Read 시작**
5. Wait for AI understanding / draft
6. Confirm with **✓ 맞습니다** / **That's right** — OR correct via **아닙니다 — 수정할게요**

Optional deep-link (also Demo, no Auth):
`/ko/workspace?demo=guided&sample=custom&fresh=1` → redirects to workspace Demo.

---

## A — 신규 최소 입력

**Path:** 프로젝트 생성(Demo) → 사업 설명 최소 → AI 1차 이해 → 부족 정보 1개 질문

**Type this:**

```
병원 대기 줄 때문에 재방문 관리가 어렵습니다.
작은 클리닉용으로 생각하고 있습니다.
```

**Click:** AI Read 시작 → ✓ 맞습니다

**Look for:**
- Understanding spine (사업 / 고객 / 문제) — not empty form primacy
- ONE clarifying question (e.g. who needs this most)
- **지금 판단** + **왜 묻나요**

**Evidence:** `media/03-minimal-input.png` (prior LIVE C)

**Conversation log (fill):**

```
Journey: A
Q1: (paste AI question)
User answer: (leave blank until B — A stops at first ask)
AI new understanding: (사업/고객/문제 summary)
Remaining gap: (e.g. customer unknown)
Quality notes:
```

---

## B — 답변 Loop

**Path:** 질문 → 답변 → Processing → 이해 업데이트 → 현재 판단 → 다음 Gap

**Continue from A** (or restart A then confirm).

**Type example answer:**

```
실제 결제 고객은 클리닉 원장이고, 환자는 서비스 사용자입니다.
```

**Click:** 답변 반영하기 / Apply answer

**Look for:**
- Brief processing (not endless fake wait)
- Updated **지금까지 이해한 내용**
- New **지금 판단**
- Next gap question (or progress advance)

**Evidence:** `media/08-overview-board.png` (prior LIVE F — answer drafted)

**Conversation log (fill):**

```
Journey: B
Q1: …
User answer: …
AI new understanding: …
Remaining gap: …
Q2: …
Judgment / Why noted: …
Quality notes: (did understanding actually change? no silent mock?)
```

---

## C — 수정 Loop

**Path:** 이전 단계 → 답변/초안 수정 → AI 재판단 → 변경된 이해 → 다음 질문

**Option 1 — Correct at confirm:**
1. After AI Read, click **아닙니다 — 수정할게요**
2. Fix wrong field(s) only
3. Click 수정 반영 / alignment complete
4. Confirm edit if prompted (**맞습니다, 다음으로**)

**Option 2 — Contradiction after answer:**
1. Answer Q1 with one customer story
2. Later answer that contradicts prior → panel **이전에 확인한 내용과 새 답변이 다릅니다**
3. Choose **새 답변이 맞아** or **이전 내용이 맞아**
4. Expect downstream invalidation + re-ask / re-judgment

**Evidence:** No dedicated core-v2 C screenshot — capture during this run if needed.

**Conversation log (fill):**

```
Journey: C
Prior understanding: …
Edit / new answer: …
AI re-judgment: …
Changed understanding: …
Next question: …
Quality notes: (did AI drop stale downstream facts?)
```

---

## D — Why Loop

**Path:** AI 판단 → 왜? → 근거 → 상세 → 수정/반박 → Update

**On ask surface (always):**
- Read **왜 묻나요** under the question (must be visible without opening Detail)

**On judgment / analysis (when present):**
1. Click **왜?**
2. Read explanation + evidence lines
3. Return via **이해 루프로 돌아가기** / collapse to 요약
4. Optionally correct understanding (C) then re-check Why

**Evidence:** `media/05-why-on-ask.png` (prior LIVE E)

**Conversation log (fill):**

```
Journey: D
Judgment: …
Why text: …
Evidence lines: …
User rebuttal / edit (if any): …
Update after: …
Quality notes: (Why specific to this project? or generic?)
```

---

## E — 문서 Flow

**Path:** 문서 업로드/붙여넣기 → AI 파악 → 표시 → 재질문 금지 → Unknown 1개 → 답변 → Update

### E1 Rich document

**Paste:**

```
# 양조장 체험 SaaS

서비스: 전통주 양조장과 MZ·FIT 관광객을 연결하는 B2B 예약 플랫폼
대상: MZ 관광객, FIT 개별 여행객
문제: 양조장 예약·동선이 파편화되어 체험 전환이 낮다
수익: 예약 수수료 + 제휴 리포트
시장: 방한 외국인 · 국내 전통주 체험
```

**Look for:** MZ/FIT or service extract visible; provenance like 문서에서 확인됨; no blank-form primacy.

**Evidence:** `media/01-document-rich.png`

### E2 Weak / unreadable

**Paste:**

```
# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.
```

**Look for:** Honest gap (읽지 못 / 충분히 / 같이); **must NOT** treat plan.pdf as business name.

**Evidence:** `media/02-document-weak-pdf.png`

**Conversation log (fill):**

```
Journey: E
Doc type: rich / weak
AI displayed understanding: …
Known (no re-ask): …
Unknown Q1: …
User answer: …
Update: …
Quality notes:
```

---

## F — 충분성

**Path:** 정보 축적 → 중간 판단 → 구체화도 → Gap 감소 → 충분성 → 다음 단계

1. Use rich doc (E1) + 2–3 meaningful answers (B)
2. Open **개요 / Overview** in sidebar
3. Watch Progress checks (사업 / 고객 / 시장…) and coverage / board labels
4. Expect mid-judgments to get more specific; gaps to shrink; stage advance by sufficiency not raw question count

**Evidence:** `media/08-overview-board.png`

**Conversation log (fill):**

```
Journey: F
Turn 1 understanding / gap / judgment:
Turn 2 …
Turn 3 …
Coverage / Progress observed:
Next stage unlocked? (Y/N + what)
Quality notes:
```

---

## Prior LIVE reuse (do not regenerate from scratch)

| File | Maps to |
|------|---------|
| scenarios-af-live.json | Prior harness A–F all PASS |
| media/01-document-rich.png | CPO E rich |
| media/02-document-weak-pdf.png | CPO E weak |
| media/03-minimal-input.png | CPO A (+ D ask chrome) |
| media/04-nonsense-answer.png | Quality gate reference (not a CPO letter) |
| media/05-why-on-ask.png | CPO D |
| media/08-overview-board.png | CPO B + F |

Missing on disk (indexed only): media/06-processing-stages.png, media/07-understanding-update.png — optional CPO capture during B.

---

## Auth

Confirm: Auth untouched. Do not use Login for this pack.
