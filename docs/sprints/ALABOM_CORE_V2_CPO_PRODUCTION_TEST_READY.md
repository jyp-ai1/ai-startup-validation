# ALABOM Core v2 — CPO Production Test Ready

Date: 2026-08-26
Mission: CPO manual conversational journey pack (quality, not button PASS)
Production: https://ai-startup-validation-tau.vercel.app
SHA target: 89e3464 (Living Understanding State SoT)
Production tip now: c485ce78dd2151eb974c5591c07772a95a50db37
Tip note: moved after 89e3464 — docs/evidence commit only; 89e3464 is ancestor (SoT still live)
Auth: UNTOUCHED (Demo path only — no OAuth / KI-1)
Code Change: NONE

## Gate summary

```
[ALABOM Core v2 CPO Production Test Ready]

Production: https://ai-startup-validation-tau.vercel.app
SHA: 89e3464 (tip now c485ce7 — includes 89e3464)

A 신규:
READY — Demo /demo/start → min doc → AI understanding → 1 gap question (media/03)

B 답변→AI Update:
READY — Ask → answer apply → Processing → understanding/judgment update (LIVE F + media/08)

C 수정:
READY — Confirm No/Edit or contradiction UI; dedicated C screenshot absent (CPO captures live)

D Why:
READY — Ask surface purpose copy + judgment Why (media/05)

E 문서:
READY — Doc paste → extract/honest gap (media/01, 02); no blank-form re-ask

F 충분성:
READY — Progress/Overview + gap reduction (media/08 · coverage % SoT)

Known Issues:
- Tip moved 89e3464 → c485ce7 (docs package); feature SHA still deployed as ancestor
- media/06-processing-stages.png and 07-understanding-update.png indexed but not on disk (F still PASS in scenarios-af-live.json)
- Cookie consent may overlay confirm CTA — dismiss first
- Locale may render EN labels; CTA matches KO+EN
- Auth durable KI-1 deferred — out of scope
- This pack does not re-run AI journeys (no unnecessary AI calls); conversation log templates for CPO fill

Evidence paths:
- docs/evidence/ALABOM/core-v2/
- docs/evidence/ALABOM/core-v2/CPO_JOURNEY_GUIDE.md
- docs/evidence/ALABOM/core-v2/scenarios-af-live.json
- docs/evidence/ALABOM/core-v2/media/

Code Change:
NONE
```

## Environment verify (2026-08-26)

| Check | Result |
|-------|--------|
| GET /api/health commit | c485ce78… |
| GET /api/build-info commit | c485ce78… |
| 89e3464 ancestor of tip | Yes |
| GET /demo/start | HTTP 200 |
| GET /demo/enter | 307 → /demo/start |
| Auth touched | No |

## Existing LIVE A–F → CPO Journey map

Prior Production Demo LIVE (serial) already PASS — reuse, do not regenerate.

| CPO Journey | Prior LIVE id | Media | Status |
|-------------|---------------|-------|--------|
| A 신규 최소 입력 | C Minimal | media/03-minimal-input.png | READY |
| B 답변 Loop | F Processing+Overview | media/08-overview-board.png | READY |
| C 수정 Loop | (UX in product; no dedicated shot) | Guide only — CPO captures | READY |
| D Why Loop | E Why on ask | media/05-why-on-ask.png | READY |
| E 문서 Flow | A Document-rich + B Weak PDF | media/01 + media/02 | READY |
| F 충분성 | F Overview board | media/08-overview-board.png | READY |

Source: docs/evidence/ALABOM/core-v2/scenarios-af-live.json · tip at capture 89e3464 in prod-build-info.json.

## Per-journey readiness

### A 신규 최소 입력 — READY

1. Open https://ai-startup-validation-tau.vercel.app/demo/start
2. Click 내 사업 문서로 체험하기
3. Paste minimal (≥40 chars), e.g.:

```
병원 대기 줄 때문에 재방문 관리가 어렵습니다.
작은 클리닉용으로 생각하고 있습니다.
```

4. Click AI Read 시작 → wait for understanding
5. Click 맞습니다 (or EN: That's right)
6. Expect: one clarifying question (gap), not a blank form

Evidence: media/03-minimal-input.png
Log template: see CPO_JOURNEY_GUIDE section A

### B 답변 → AI Update — READY

Continue from A ask surface (or restart with rich doc → confirm → ask).

1. Read 지금 판단 + 이번 질문
2. Type a real answer (≥4 chars meaningful)
3. Click 답변 반영하기 / Apply answer
4. Observe Processing stages (brief) → understanding update → next gap or judgment

Evidence: media/08-overview-board.png (answer in box); LIVE F PASS
Log template: Guide section B

### C 수정 Loop — READY

1. From understanding confirm: 아닙니다 — 수정할게요 → fix wrong field → 수정 반영
2. Or after an answer that contradicts prior: choose 새 답변이 맞아 / 이전 내용이 맞아
3. Expect: AI re-judgment, changed understanding, next question (downstream invalidated)

Evidence: Product UX present; no dedicated core-v2 C screenshot — CPO fills log during manual run
Log template: Guide section C

### D Why Loop — READY

1. On ask surface: read 왜 묻나요 (always on ask — not Detail-only)
2. Optional later: on judgment/analysis panel open 왜? → evidence → return to loop / 수정·반박

Evidence: media/05-why-on-ask.png
Log template: Guide section D

### E 문서 Flow — READY

1. /demo/start → 내 사업 문서로 체험하기
2. Paste rich business doc (or weak/unreadable PDF text)
3. AI Read 시작
4. Expect: extracted understanding shown; no blank-form primacy; weak doc → honest Unknown, not filename-as-business
5. Confirm → one Unknown question → answer → Update (no re-ask of already-known)

Evidence: media/01-document-rich.png · media/02-document-weak-pdf.png
Log template: Guide section E

### F 충분성 — READY

1. Accumulate answers across B (and optional E)
2. Watch Progress (사업→고객→시장…) and Overview board / coverage
3. Expect: mid-judgment updates, gaps shrink, sufficiency can unlock next stage (not question-count only)

Evidence: media/08-overview-board.png
Log template: Guide section F

## Conversation log (CPO fills live)

Prefer Demo — no Auth. Do not treat prior button PASS as conversational quality.

```
Journey: _
Q1: _
User answer: _
AI new understanding: _
Remaining gap: _
Q2: _
…
Judgment / Why noted: _
Pass quality notes (tone, specificity, no fake merge): _
```

## Known Issues (non-blocking for CPO start)

1. Production tip c485ce7 ≠ literal 89e3464 — feature still present (ancestor).
2. Indexed media 06 / 07 missing on disk; F still documented PASS.
3. Cookie / locale overlays — dismiss before judging UX.
4. Auth KI-1 HOLD — Demo only for this pack.
5. Full Domain 01–20 durable store still derived — not a journey blocker.

## Auth

Confirm: Auth untouched. No OAuth, CDP, or storageState changes in this mission.

## Code Change

NONE
