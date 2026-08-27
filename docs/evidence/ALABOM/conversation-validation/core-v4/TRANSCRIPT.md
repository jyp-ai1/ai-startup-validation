# ALABOM Core Conversation Engine v4 — TRANSCRIPT-LIVE (Production Demo)

| Meta | Value |
|------|-------|
| Session (UTC) | 2026-08-27T07:13:03.435Z |
| Production commit (`/api/build-info`) | `7da3ed951f8af3861b018f298355affc7e7a5e4b` |
| Fix commit on main | `7da3ed9` (Core v4 Long Fix) |
| **shaMatch** | **true** |
| Entry | `/demo/start` (Demo, no auth) |
| Seed | 외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다. |
| Playwright | `apps/web/e2e/_cpo-core-v4-prod-capture.spec.ts` |
| Turns captured | 12 |
| Final review reachable | true |
| Auth / KI-1 | EXCLUDED |

## Deploy poll

Polled `GET https://ai-startup-validation-tau.vercel.app/api/build-info`. Attempts 1–2: `677e98a` (pre-v4). Attempt 3 (~2–3 min): **`7da3ed9`** — gate passed. See `prod-build-info-poll.json`.

## Scenario coverage

| Scenario | Turns | Observed |
|----------|-------|----------|
| **1. New user (Demo)** | 1–2 | `/demo/start` → document seed → AI read → confirm ✓ |
| **2. Document-based** | 1 | BUSINESS + CUSTOMER (방한 외국인) from document; PROBLEM Needs confirmation |
| **3. Answer → understanding → next Q** | 3–4 | Problem → Understanding; next = payer; payer confirmed → next = competition (no revenue loop) |
| **4. Prior answer edit** | 7 | `← 이전 답변 수정` exercised; CUSTOMER superseded to FIT+국내 MZ 정정 |
| **5. Why / objection / mid-summary** | 5–6 | Why challenge display-only; mid-summary display-only (buyer listed, not auto-Confirmed beyond existing) |
| **6. Competition / differentiation** | 4, 7–8 | Competition branch entered after basics; competitor text in Understanding; Progress shows Competition analyzed |
| **7. Sufficiency → final** | 10–12 | Understanding sufficient → start analysis → HOLD + critical gap (differentiation) |

## Hard P0 observation (factual)

| Check | Count | Notes |
|-------|------:|-------|
| Same-meaning **business** re-ask (revenue×N style) | **0** | After payer answer, next Q = competition — not revenue×8 |
| Automated `re-ask-same-question-text` (includes why/mid return) | 2 | Turns 5–6: same competition Q after why/mid **display-only** — not a Fact merge re-ask |
| Wrong-slot (`정의]` / competitor→CUSTOMER) | **0** | CUSTOMER = 방한 외국인 → later edit text; competitor under Understanding competitor bullet |

## Turn-by-turn (readable body)

### Turn 1 — `01-after-ai-read`
- **User:** (seed document)
- **AI Q:** (reading / confirm gate)
- **Understanding:** BUSINESS = 맞춤형 경험 사업 (document); CUSTOMER = 방한 외국인 (estimate); PROBLEM = Needs confirmation
- **whyNow / slots:** initial document intake
- **Media:** `media/01-after-ai-read.png`

### Turn 2 — `02-q1-after-confirm`
- **User:** (confirm ✓ 맞습니다)
- **AI Q:** 지금 가장 크게 해결하려는 불편은 무엇인가요?
- **AI judgment:** 지금까지 확인: businessOneLiner … 남은 핵심 공백「problemJtbd」. 그래서 지금 이 질문을 합니다. 커버리지 20% (필드 채움률이 아님).
- **whyNow:** 해결하려는 불편이 비어 있으면 사업 판단의 출발점이 없습니다.
- **Slots:** PROBLEM gap
- **Media:** `media/02-q1-ask.png`

### Turn 3 — `03-after-problem`
- **User:** 패키지 투어는 동선이 획일적이고… 반나절 단위 맞춤 일정이 필요합니다.
- **AI Q (next):** 서비스 비용은 누가 지불하나요?
- **AI judgment:** problemJtbd confirmed · 남은 공백「payer」· 커버리지 30%
- **Understanding delta:** PROBLEM founder-confirmed in spine; Understanding bullets include problem answer
- **whyNow:** 누가 비용을 지불하는지 모르면 GO/HOLD를 결정할 수 없습니다.
- **Slots:** problem → payer
- **Media:** `media/03-after-problem.png`

### Turn 4 — `04-after-payer-or-next`
- **User:** 관광객이 앱에서 일정·체험을 직접 예약·결제합니다.
- **AI Q (next):** 비슷한 역할을 이미 하고 있는 서비스가 있나요?
- **AI judgment:** payer confirmed · 남은 공백「alternativesCompetitors」· 커버리지 40%
- **Understanding delta:** payer/buyer fact in Understanding; **did not stick on revenue Q**
- **whyNow:** 이미 쓰는 대안·경쟁이 비면 차별화를 판단할 기준이 없습니다.
- **Slots:** payer → competition
- **Media:** `media/04-after-payer.png`

### Turn 5 — `05-why-challenge`
- **User:** 왜 그게 중요하죠?
- **AI:** Why follow-up panel (display-only) — returns to competition Q
- **Fact merge:** none (why_meta)
- **Notes:** same Q text visible after why — expected loop return, not revenue re-ask
- **Media:** `media/05-why.png`

### Turn 6 — `06-mid-review`
- **User:** 지금까지 이해한 사업 정리해줘
- **AI mid-judgment panel:** business / problem / buyer listed; “(화면 표시만 — Fact DB 미저장)”
- **Returns to:** competition Q
- **Media:** `media/06-mid-review.png`

### Turn 7 — `07-prior-edit`
- **User (via prior-edit):** 정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.
- **AI Q (next):** 경쟁 대비 이 서비스만의 차별점은 무엇인가요? → (after process) channel Q observed in snap
- **AI judgment:** customerPersona superseded to edit text · 커버리지 40%
- **Spine CUSTOMER:** Founder confirmed with edit text (not `정의]`)
- **Media:** `media/07-prior-edit.png`

### Turn 8 — `08-competition-l1`
- **User:** 클룩·트립닷컴·가이드 매칭 앱이… 관심사·동선 맞춤이 약합니다.
- **AI Q (next):** 고객·수요를 검증할 채널은 어디인가요?
- **Understanding:** competitor bullet present; Progress **Competition analyzed**
- **Wrong-slot check:** competitor text **not** under CUSTOMER as sole dump
- **Media:** `media/08-competition.png`

### Turn 9 — `08-continue-l2`
- **User:** (script matched competition text again while pricing Q visible — capture force path)
- **AI Q:** 가격·요금에 대한 가설이나 신호가 있나요?
- **whyNow:** 가격 신호가 없으면 수익·지불 의사 검증을 설계할 수 없습니다.
- **Media:** `media/08-continue-l2.png`

### Turn 10 — `08-revenue-l3`
- **User:** 수익은 예약 건당 중개 수수료 10~15%와 현지 파트너 제휴 리포트 구독입니다.
- **Result:** Sufficiency gate — “Understanding is sufficient… (Not based on answer count.)” + start analysis CTA
- **Media:** `media/08-revenue.png`

### Turn 11 — `11-sufficiency`
- **User:** (overview / sufficiency)
- **Surface:** BUSINESS / CUSTOMER / PROBLEM confirmation + “That's right — start analysis”
- **Media:** `media/11-sufficiency.png`

### Turn 12 — `12-final-viability`
- **User:** (clicked start analysis)
- **AI judgment:** HOLD — Critical Unknown (differentiation gap called out)
- **Supporting score:** Reference score 70 (supporting only)
- **Media:** `media/12-final-review.png`

## vs POSTFIX LIVE @ 677e98a

| Dimension | POSTFIX @ 677e98a | Core v4 LIVE @ 7da3ed9 |
|-----------|-------------------|-------------------------|
| Revenue re-ask ×8 | yes (turns 4–13) | **no** — payer → competition |
| CUSTOMER `정의]` | yes | **not observed** |
| Competitor → CUSTOMER | turn 17 | **0 wrong-slot hints** |
| Judgment before Q | weak | CURRENT JUDGMENT + whyNow details |
| Prior edit | not exercised | **exercised** (turn 7) |
| Why challenge | not scripted | **exercised** (turn 5) |
| Final | HOLD 74 path | HOLD + differentiation critical gap |

## Explicit non-claims

- Does **not** claim CPO PASS.
- Auth untouched (Demo only).
- Automated re-ask counter includes why/mid return (turns 5–6); CPO should judge same-meaning **business** re-ask separately (observed **0** revenue-loop style).
- Differentiation Q was partially interleaved with prior-edit / channel / pricing — competition text is in Understanding; dedicated differentiation answer not isolated as its own labeled turn.

## Evidence files

- `transcript-raw.json`
- `prod-build-info.json` / `prod-build-info-poll.json`
- `FINDINGS.md`
- `media/*.png`
