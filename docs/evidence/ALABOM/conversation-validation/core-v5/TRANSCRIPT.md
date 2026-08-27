# ALABOM Core Conversation Engine v5 — TRANSCRIPT-LIVE (Production Demo)

| Meta | Value |
|------|-------|
| Session (UTC) | 2026-08-27T07:57:06.701Z (`transcript-raw.json` → `at`) |
| Production commit (`/api/build-info`) | `ffd500c72649742627421e2f598f6208d3d65db8` |
| Fix SHAs | `8b30c51` (engine) · `ffd500c` (pin) · `8b05c4f` (gate tip) |
| **shaMatch** | **true** |
| Entry | `/demo/start` (Demo, no auth) |
| Seed | 외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다. |
| Playwright | `apps/web/e2e/_cpo-core-v5-prod-capture.spec.ts` |
| Turns captured | 16 |
| Final review reachable | true |
| Auth / KI-1 | EXCLUDED |

## Deploy poll

Polled `GET https://ai-startup-validation-tau.vercel.app/api/build-info`. Attempts 1–4: `75a2122` (pre-pin). Attempt 5: **`ffd500c`** — gate passed (`shaMatch=true`). See `prod-build-info-poll.json` / `prod-build-info.json`.

## Scenario coverage

| Scenario | Turns | Observed |
|----------|-------|----------|
| **1. New business (Demo)** | 1–2 | `/demo/start` → thin seed → AI read → confirm ✓ |
| **2. Document-based** | 1 | BUSINESS from document; CUSTOMER = 방한 외국인 (AI estimate); PROBLEM Needs confirmation |
| **3. Incomplete doc** | 1–2 | Single-paragraph seed; gap-heavy understanding; coverage 15% at first ask |
| **4. Answer → understanding → next Q** | 3–4 | Problem → payer; payer → **differentiation** (before dedicated competitor ask) |
| **5. Nonsense** | 5 | `ㅋㅋㅋㅋㅋㅋ` → reject copy; same differentiation Q; Understanding unchanged |
| **6. Why / objection** | 6 | `왜 그게 중요하죠?` → why panel; returns to same differentiation Q |
| **7. Mid-summary** | 7 | `지금까지 이해한 사업 정리해줘` → display-only summary; “(화면만 — Confirmed Fact 미저장)” |
| **8. Prior edit** | 8 | `← 이전 답변 수정` / edit text → CUSTOMER superseded (FIT + 국내 MZ) |
| **9. Contradiction** | 9 | Payer flipped to B2B hotel/OTA settlement; Understanding shows B2B (확인이 필요) |
| **10. Competitor** | 11 | Competitor text (클룩·트립닷컴…) applied while pricing Q visible (capture pairing noise) |
| **11. Pricing** | 12 | Revenue/pricing answer while competitor Q visible |
| **12. Differentiation** | 4, 13 | Differentiation Q early (turn 4); dedicated differentiation answer at turn 13 (conflict UI vs prior customer edit) |
| **13. Sufficiency** | 14–15 | “Understanding is sufficient… (Not based on answer count.)” · Start Analysis visible & enabled |
| **14. Final review** | 16 | After Start Analysis → HOLD + Critical Unknown (competition/alternatives) |

## Hard P0 observation (factual)

| Check | Count | Notes |
|-------|------:|-------|
| Automated `re-ask-same-question-text` (incl. why/mid/nonsense) | **4** | Turns 5–7 + 13 per `reAskSameQuestionCount` / `templateLikeHints` |
| Wrong-slot hints | **1** | Turn 11: competitor answer into pricing Q (`wrongSlotHints`) |
| Mixed-Q hints | **5** | `mixed-competition+pricing+customer-on-one-screen` (pending + turns 11, 12, 13, 16) |
| `criticalGapBlockedStartAnalysis` | **false** | Start Analysis probe: visible=true · disabled=false · criticalCopy=false |

**Explicit LIVE observation:** After Start Analysis, final surface shows **HOLD** with Critical Unknown about competition/alternatives. **Start Analysis was not blocked** while critical gaps remained on LIVE Demo overview (`criticalGapBlockedStartAnalysis=false`).

## Turn-by-turn (readable body)

### Turn 1 — `01-after-ai-read`
- **Media:** `media/01-after-ai-read.png`
- **User:** (seed document)
- **AI Q:** (reading / confirm gate — no ask yet)
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** initial document intake
- **unresolvedGap:** (pre-ask) PROBLEM Needs confirmation; Competition pending
- **Slots / judgment:** BUSINESS confirmed from document; CUSTOMER = 방한 외국인 (AI estimate); PROBLEM 아직 확인 중
- **Notes:** New business Demo entry + document-based thin seed (incomplete-doc style)

### Turn 2 — `02-q1-after-confirm`
- **Media:** `media/02-q1-ask.png`
- **User:** (confirm ✓ 맞습니다)
- **AI Q:** 지금 가장 크게 해결하려는 불편은 무엇인가요?
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** 해결하려는 불편이 비어 있으면 사업 판단의 출발점이 없습니다. 핵심 문제를 먼저 고정합니다.
- **unresolvedGap:** `problemJtbd`
- **Slots / judgment:** CURRENT JUDGMENT — businessOneLiner confirmed; 불확실: categoryScope, customerPersona; 커버리지 15%; 남은 핵심 공백「problemJtbd」
- **Notes:** post-confirm first ask — incomplete-doc gaps still show; stock-template-phrasing hint

### Turn 3 — `03-after-problem`
- **Media:** `media/03-after-problem.png`
- **User:** 패키지 투어는 동선이 획일적이고, 혼자 계획하면 언어·시간 때문에 현지인 일상에 가까운 경험을 놓칩니다. 관심사와 체류일수에 맞춘 반나절 단위 맞춤 일정이 필요합니다.
- **AI Q (next):** 서비스 비용은 누가 지불하나요?
- **understandingDelta:** empty on UI capture (Understanding bullets include problem answer)
- **whyNow / purpose:** 누가 비용을 지불하는지 모르면 GO/HOLD를 결정할 수 없습니다. 지불자를 지금 확정합니다.
- **unresolvedGap:** `payer`
- **Slots / judgment:** problemJtbd confirmed · 커버리지 25% · 지금 판단: 수익 구조가 확인되지 않았습니다
- **Causality:** Q2 (payer) follows A1 (problem) — gap advances problemJtbd → payer
- **Notes:** answer → understanding → next Q (problem slot preferred)

### Turn 4 — `04-after-payer-or-next`
- **Media:** `media/04-after-payer.png`
- **User:** 관광객이 앱에서 일정·체험을 직접 예약·결제합니다.
- **AI Q (next):** 경쟁 대비 이 서비스만의 차별점은 무엇인가요?
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** 경쟁만 알고 차별이 없으면 「왜 우리인가」를 말할 수 없습니다. 차이점을 지금 확인합니다.
- **unresolvedGap:** `differentiationVsAlternatives`
- **Slots / judgment:** payer confirmed · 커버리지 35% · 지금 판단: 시장 근거가 확인되지 않았습니다
- **Causality:** after payer answer, next gap = differentiation (not a dedicated competitor ask first)
- **Notes:** Differentiation asked **before** dedicated competitor ask in early turns

### Turn 5 — `05-nonsense`
- **Media:** `media/05-nonsense.png`
- **User:** ㅋㅋㅋㅋㅋㅋ
- **AI Q:** 경쟁 대비 이 서비스만의 차별점은 무엇인가요? (same Q re-ask)
- **understandingDelta:** empty; Understanding unchanged vs prior
- **whyNow / purpose:** (same differentiation whyNow)
- **unresolvedGap:** `differentiationVsAlternatives` (unchanged)
- **Slots / judgment:** 커버리지 35%; gapChangeNote = unchanged vs prior snap
- **Notes:** nonsense hangul mash — reject / no fact stored; UI: “That doesn't answer this question…”; `re-ask-same-question-text`

### Turn 6 — `06-why-challenge`
- **Media:** `media/06-why.png`
- **User:** 왜 그게 중요하죠?
- **AI Q:** 경쟁 대비 이 서비스만의 차별점은 무엇인가요? (same Q after why panel)
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** differentiation whyNow restated in why panel; also notes 핵심 공백「market_validation」in follow-up copy
- **unresolvedGap:** `differentiationVsAlternatives`
- **Slots / judgment:** 커버리지 35%; why follow-up display; returns to same ask
- **Notes:** explicit why challenge; `re-ask-same-question-text`

### Turn 7 — `07-mid-review`
- **Media:** `media/07-mid-review.png`
- **User:** 지금까지 이해한 사업 정리해줘
- **AI Q:** 경쟁 대비 이 서비스만의 차별점은 무엇인가요? (still on ask; mid-summary panel shown)
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** (same differentiation whyNow on ask surface)
- **unresolvedGap:** `differentiationVsAlternatives`
- **Slots / judgment:** Mid-summary lists business / problem / buyer; “(이 요약은 화면에만 표시되며 Confirmed Fact로 저장되지 않습니다.)”
- **Notes:** mid-summary display-only; `re-ask-same-question-text`; raw `nextQuestion` later shows relevance Q (“그 차별점이 고객에게 왜 중요한가요?”) — see turn 8

### Turn 8 — `08-prior-edit`
- **Media:** `media/08-prior-edit.png`
- **User:** 정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.
- **AI Q:** 그 차별점이 고객에게 왜 중요한가요? 어떤 순간에 체감되나요?
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** 차별점이 고객에게 왜 중요한지 모르면 검증 설계를 할 수 없습니다. 고객 관련성을 지금 확인합니다.
- **unresolvedGap:** `validationTestability`
- **Slots / judgment:** customerPersona superseded to edit text · 커버리지 50% · Overview: Competition analyzed · 지금 판단: 경쟁이 확인되지 않았습니다
- **Notes:** prior answer edit supersedes judgment; CUSTOMER spine shows founder-confirmed edit text

### Turn 9 — `09-contradiction`
- **Media:** `media/09-contradiction.png`
- **User:** 앞서와 달리 정정합니다. 결제자는 관광객이 아니라 B2B로 호텔·OTA가 일괄 정산합니다.
- **AI Q:** 경쟁사가 따라오기 어려운 방어력은 무엇인가요?
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** 따라오기 어려운 방어력이 비면 「지속 가능한 차별」을 판단할 수 없습니다. 방어력을 지금 확인합니다.
- **unresolvedGap:** (judgmentBlock empty on this snap)
- **Slots / judgment:** Understanding includes B2B correction + “(확인이 필요)”; prior payer text still listed under edit picker as revenue model
- **Notes:** contradiction / correction — payer flipped to B2B hotel/OTA settlement

### Turn 10 — `14-defensibility-l1`
- **Media:** `media/14-defensibility.png`
- **User:** 현지 파트너 네트워크와 관심사 그래프가 쌓일수록 따라오기 어렵습니다.
- **AI Q:** 고객·수요를 검증할 채널은 어디인가요?
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** 도달 채널이 비면 수요 검증을 어디서 할지 모릅니다. 검증 채널을 지금 정합니다.
- **unresolvedGap:** `solution` (judgment)
- **Slots / judgment:** payer fact now shows B2B correction text · 커버리지 60% · 지금 판단: 시장 근거가 확인되지 않았습니다
- **Notes:** Defensibility answer while channel Q visible (script sequencing); next Q → pricing

### Turn 11 — `10-competition-l2`
- **Media:** `media/10-competition.png`
- **User:** 클룩·트립닷컴·가이드 매칭 앱이 이미 있지만, 대부분 카탈로그형 상품 나열이라 관심사·동선 맞춤이 약합니다.
- **AI Q:** 가격·요금에 대한 가설이나 신호가 있나요?
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** 가격 신호가 없으면 수익·지불 의사 검증을 설계할 수 없습니다.
- **unresolvedGap:** `solution`
- **Slots / judgment:** competitor bullet in Understanding · 커버리지 65% · Market understanding ✔ · Competition analyzed ✔
- **Notes:** **wrong-slot hint** — competitor answer into pricing Q; mixed-competition+pricing+customer-on-one-screen

### Turn 12 — `15-pricing-l3`
- **Media:** `media/15-pricing.png`
- **User:** 수익은 예약 건당 중개 수수료 10~15%와 현지 파트너 제휴 리포트 구독입니다.
- **AI Q:** 비슷한 역할을 이미 하고 있는 서비스가 있나요?
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** 이미 쓰는 대안·경쟁이 비면 차별화를 판단할 기준이 없습니다. 지금 쓰는 대안을 확인합니다.
- **unresolvedGap:** `solution`
- **Slots / judgment:** revenue text in Understanding; 커버리지 65% unchanged; decision copy polluted with AI PM header fragment in snap
- **Notes:** pricing/revenue answer while competitor Q visible; mixed-Q hint; stock-template-phrasing

### Turn 13 — `11-differentiation-l4`
- **Media:** `media/11-differentiation.png`
- **User:** 차별점은 관심사·동선·식사 제약까지 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 묶는 점입니다.
- **AI Q:** 비슷한 역할을 이미 하고 있는 서비스가 있나요? (same competitor Q still shown)
- **understandingDelta:** empty on UI capture
- **whyNow / purpose:** (same alternatives/competitor whyNow)
- **unresolvedGap:** `solution`
- **Slots / judgment:** Conflict UI — “That conflicts with what we already confirmed…” comparing prior customer edit vs differentiation answer
- **Notes:** `re-ask-same-question-text` + mixed-Q; differentiation answer paired with competitor ask surface

### Turn 14 — `10-continue-l5`
- **Media:** `media/10-continue-l5.png`
- **User:** 수익은 예약 건당 중개 수수료 10~15%와 현지 파트너 제휴 리포트 구독입니다. (capture force / continue path)
- **AI Q:** (sufficiency / confirm surface — no numbered ask)
- **understandingDelta:** empty
- **whyNow / purpose:** n/a
- **unresolvedGap:** n/a on ask panel
- **Slots / judgment:** “Understanding is sufficient. Moving to validation… (Not based on answer count.)” · BUSINESS / CUSTOMER / PROBLEM confirm · “That's right — start analysis”
- **Notes:** sufficiency gate reached; Ready for review ●

### Turn 15 — `17-sufficiency-start-probe`
- **Media:** `media/17-sufficiency-start-probe.png`
- **User:** (start-analysis probe)
- **AI Q:** (same sufficiency confirm surface)
- **understandingDelta:** empty
- **whyNow / purpose:** n/a
- **Probe notes (raw):** `startAnalysis.visible=true` · `startAnalysis.disabled=false` · `criticalCopy=false`
- **Slots / judgment:** Start Analysis CTA enabled on Demo overview
- **Explicit:** `criticalGapBlockedStartAnalysis=false` — Start Analysis **not** blocked while critical gaps may remain

### Turn 16 — `20-final-viability`
- **Media:** `media/20-final-review.png`
- **User:** (clicked start analysis)
- **AI Q:** (final review / HOLD surface)
- **understandingDelta:** empty
- **AI judgment (surface):** HOLD — Critical Unknown 6건 — 이미 쓰는 대안·경쟁이 비면 차별화를 판단할 기준이 없습니다. 지금 쓰는 대안을 확인합니다.
- **Supporting score:** Reference score 70 (supporting only); SUMMARY also shows “Differentiation in B2B SaaS is clear…” (template-like / mixed copy)
- **Slots / judgment:** AI analysis complete ✔ · Progress Ready for review ✔ · mixed-Q hint on final surface
- **Notes:** Final review after Start Analysis; **HOLD with Critical Unknown about competition/alternatives** — confirms Start Analysis ran despite critical-gap copy still present post-analysis

## Explicit non-claims

- Does **not** claim CPO PASS.
- Auth untouched (Demo only).
- Does **not** claim `criticalGapBlockedStartAnalysis` worked on LIVE (observed **false**).
- Automated re-ask counter includes why/mid/nonsense returns (4); CPO should separate business same-meaning re-ask judgment.
- Capture Q/A pairing on pricing/competition turns is noisy — treat pairing as evidence of sequencing friction, not as clean slot proof.
- Differentiation was asked before a dedicated competitor ask early in the journey (turn 4).

## Evidence files

- `transcript-raw.json`
- `prod-build-info.json` / `prod-build-info-poll.json`
- `FINDINGS.md`
- `media/*.png`
