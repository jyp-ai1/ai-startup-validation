# ALABOM — DAY 8-C CEO Real Journey Observation

**Production SHA:** `bb5e310` (docs-only delta; functional code = `c253120`)  
**Production URL:** https://ai-startup-validation-tau.vercel.app  
**Observation date:** 2026-09-05  
**Raw capture:** [DAY_8C_OBSERVATION_RAW.json](./DAY_8C_OBSERVATION_RAW.json)  
**Screenshots:** `/opt/cursor/artifacts/screenshots/day8c/`

> **Gate type:** Production Observation — **no code changes.**

---

## 1. Journey Summary

**총 진행 Turn:** 5 (bootstrap + 4 CEO answers)  
**관찰 시간:** ~35분 (Production Journey 1회 + persistence 3 cases)  
**진입 경로:** Landing → Demo SaaS (`/workspace?demo=guided&sample=saas&fresh=1`) → Focused UI ON

| Step | CEO Action | Result |
|------|------------|--------|
| Landing | 진입 | ALABOM 브랜딩, Demo CTA 확인 |
| Workspace | "맞습니다" 확인 | Focused 3-block surface 표시 |
| Turn 1 | 사업 한 줄 답변 | Understanding 반영, 다음 Q = 제공 가치 |
| Turn 2 | 경쟁/대안 답변 (제공 가치 Q에) | Understanding에 경쟁 내용 append, Q = 고객 |
| Turn 3 | Correction (꽃집→반찬가게) | Understanding 고객 수정, Q = 지불자 |
| Turn 4 | "경쟁사 찾아줘" | Research stub 표시, Q unchanged |
| Persistence | F5 × 3 cases | Draft / state / re-entry 모두 유지 |

---

## 2. ① AI가 해야 할 일을 CEO에게 물었는가

**PASS** (routing layer) / **애매** (CEO 체감 layer)

**Evidence:**

Turn 4 — CEO: `"경쟁사 찾아줘"`

- `researchStubVisible: true` — RESEARCH intent 인식, question engine 정지
- `questionAfter === questionBefore` — `"서비스 비용은 누가 지불하나요?"` unchanged
- 새 질문으로 변환되지 않음 ✅

**CEO 체감 애매:**

- Research stub panel은 표시되지만 **실제 조사 결과/진행 상태가 CEO-facing으로 보이지 않음**
- 화면에는 여전히 "지불자" 질문이 대기 중 → CEO 입장에서는 *"찾아달라고 했는데 왜 또 물어봐?"* friction 가능
- Phase 2 stub 범위 내 routing PASS이나, **AI PM이 일을 시작했다는 느낌**은 약함

---

## 3. ② 이미 말한 내용을 다시 물었는가

**FAIL** (semantic repeat)

**Evidence:**

Turn 1 CEO 답변에 이미 포함:

> "반찬가게와 꽃집에 직접 배송하는 소상공인을 위한…"

Turn 2 질문 (제공 가치):

> "문제를 해결하는 방식(제공 가치)은 무엇인가요?"

Turn 2 CEO가 경쟁 답변을 제공 (질문 intent mismatch)

Turn 3 질문:

> "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?"

→ Turn 1에서 **고객(반찬가게·꽃집 소상공인)을 이미 명시**했으나, 고객 narrowing 질문을 다시 요구.

Turn 3 Correction으로 고객을 수정한 뒤, **고객 질문을 건너뛰고** 바로:

> "서비스 비용은 누가 지불하나요?"

**판정:** 동일 semantic cluster(고객) 반복 + correction 후 pending customer Q skip.

---

## 4. ③ 질문이 이해되지 않은 순간

**FAIL** (1건 명확, 1건 애매)

**Evidence:**

### FAIL — Turn 2 intent mismatch

- **질문:** "문제를 해결하는 방식(제공 가치)은 무엇인가요?"
- **CEO 자연 반응:** 경쟁/대안 (Notion, Linear, Jira) 답변
- **결과:** Understanding에 `"제공 가치는 Notion, Linear, Jira…"` 로 저장 — **경쟁 답변이 solution slot에 들어감**
- CEO 입장: *"제공 가치를 물었는데, 경쟁 이야기를 하면 되는 건가?"* — 질문-답변 frame 불일치

### 애매 — Turn 0 Understanding 품질

- Bootstrap understanding: `"스마트PM 핵심 문제는 문제: 전략 검토가 회의마다 리셋됨입니다."`
- `"문제: 문제:"` 중복 — 읽기 awkward, AI PM 신뢰도 저하

### 애매 — Understanding concatenation

- Turn 2+ understanding 끝: `"...봅니다.입니다."` — 문장 부호/조사 중복 append artifact

---

## 5. ④ AI가 실제로 사업을 이해한다고 느껴진 순간

**Evidence:**

### Turn 3 — Correction (핵심 성공 신호)

**Before understanding:**

> "반찬가게와 꽃집에 직접 배송하는 소상공인…"

**CEO correction:**

> "아니요. 제가 말한 핵심 고객은 꽃집이 아니라 반찬가게입니다."

**After understanding:**

> "스마트PM **주요 고객은 반찬가게**입니다. 핵심 문제는 **반찬가게에** 직접 배송하는 소상공인…"

- 꽃집 active understanding에서 제거 ✅
- 다음 질문 맥락도 반찬가게 기준으로 이어짐 ✅
- **④번 신호 명확히 발생** — "얘가 내 말을 듣고 생각을 바꿨다"

### Turn 1 — 사업 답변 반영

- CEO 한 줄 답변이 understanding 첫 block에 반영
- "지금 확인할 것" confirm prompt로 **왜 다음 질문인지** 설명 → Focused UI 가치

### Focused UI — 정보 밀도

- 6-surface accordion 대비 **3-block이 CEO attention에 유리**
- "지금까지 AI가 이해한 내용" accordion 없어도 핵심은 surface에 노출

---

## 6. A-U-J-Q

| Link | Observation | Grade |
|------|-------------|-------|
| **A → U** | CEO 답변이 understanding text에 반영됨. Correction 시 overwrite 동작. | **PASS** |
| **U → J** | Judgment가 **4턴 모두 동일**: `"경쟁·대안 환경을 더 구체적으로 알면 차별 포인트 판단이 가능합니다."` — competitor 답변·correction 후에도 unchanged | **FAIL** |
| **J → Q** | Question은 gap engine에 따라 전환됨. Confirm prompt가 gap rationale 제공. | **PASS** (partial) |

**핵심:** Understanding은 살아 있으나 **Judgment가 살아 있지 않음**.  
CEO가 느끼기에 *"AI가 다음 판단을 바꿨는가?"* → **아니오** (J layer static).

---

## 7. Question Quality

| 기준 | Turn 0 (한 줄) | Turn 1 (제공 가치) | Turn 2 (고객) | Turn 3 (지불자) |
|------|----------------|-------------------|---------------|----------------|
| Context | PASS | PASS | PASS | PASS |
| Specificity | PASS | PASS | PASS | PASS |
| Continuity | N/A | PASS | **FAIL** | **FAIL** (customer Q skip) |
| Novelty | PASS | PASS | **FAIL** | PASS |
| Judgment | PASS | PASS | PASS | PASS |
| Actionability | PASS | PASS | PASS | PASS |

**종합:** 질문 자체는 gap rationale과 함께 **읽을 수 있으나**, cluster/continuity에서 CEO friction 발생.

---

## 8. AI Work vs CEO Work

### AI가 해야 하는 것 (관찰)

| 요청/기대 | 실제 | 판정 |
|-----------|------|------|
| 경쟁사 조사 ("경쟁사 찾아줘") | RESEARCH stub, Q freeze | routing PASS, execution stub |
| 기존 답변 구조화 | Understanding append | partial — concatenation artifact |
| 정보 충돌 탐지 (correction) | customer overwrite | **PASS** |
| 이미 입력된 고객 인식 | Turn 2에서 재질문 | **FAIL** |

### CEO가 해야 하는 것 (관찰)

| 질문 | 적절성 |
|------|--------|
| 한 줄 사업 정의 | ✅ CEO 판단 필요 |
| 제공 가치 | ✅ CEO 판단 필요 |
| 고객 narrowing | ✅ intent OK, timing FAIL (already stated) |
| 지불자 | ✅ CEO 판단 필요 |

**경계 판정:** Research routing은 AI work로 인식하나 **CEO-facing action feedback 부족**.  
Question engine은 여전히 **gap-filling consultant** 쪽에 가까움.

---

## 9. Persistence

| Case | Test | Result |
|------|------|--------|
| **A** Draft F5 | `"DAY8C draft test — 소상공인 배송 관리"` | ✅ restored |
| **B** Post-answer F5 | Understanding / Judgment / Question | ✅ maintained |
| **C** Re-entry (`fresh=1` 없이) | 4턴 후 `/workspace?demo=guided&sample=saas` | ✅ context alive |

**Draft key note:** sessionStorage key remains `launchlens.aiPmAnswerDraft.{projectId}` — naming mismatch, 기능 무관.

---

## 10. CEO-like Friction — TOP 5

1. **Judgment static** — 4턴 동안 동일 문장. "AI PM이 판단하고 있다" 느낌 없음.
2. **고객 재질문** — Turn 1에서 이미 말한 고객을 Turn 2에서 다시 요구.
3. **제공 가치 vs 경쟁 혼선** — Turn 2 질문 frame과 CEO 자연 답변 방향 불일치; system이 competitor를 solution slot에 저장.
4. **Understanding text quality** — `"문제: 문제:"`, `"...봅니다.입니다."` — copy-paste/concat artifact.
5. **Research stub invisible action** — routing은 맞지만 CEO에게 "내가 시킨 일이 시작됐다"는 피드백 약함.

---

## 11. CEO-like Value — TOP 5

1. **Correction (꽃집→반찬가게)** — semantic revision, natural, trust-building.
2. **Focused 3-block UI** — Understanding / Judgment / Confirm+Question 한 화면.
3. **"지금 확인할 것" rationale** — 왜 이 질문인지 CEO-readable.
4. **Bootstrap first Q ≠ marketChannel** — 사업 정의부터 시작, 자연스러움.
5. **Persistence** — F5/re-entry 후 맥락 유지, demo 신뢰도.

---

## 12. Product Diagnosis

**현재 ALABOM은: C — AI Consultant와 AI PM **사이****

**근거:**

| AI Consultant 쪽 | AI PM 쪽 |
|------------------|----------|
| Gap-filling question sequence | Understanding live update |
| Static judgment regardless of answers | Correction semantic revision |
| Repeated semantic cluster questions | Focused UI + confirm rationale |
| Answer stored in wrong slot (competitor→solution) | Research intent routing |

**한 줄:** Understanding layer는 PM 방향으로 진화 중이나, **Judgment layer가 dead** → CEO는 *"정리해주는 AI"*보다 *"체크리스트 질문 AI"*에 더 가깝게 느낄 가능성.

**"계속 사용할 것인가?" (CTO self-assessment):**  
Correction moment만으로는 유지 의향 생김. Judgment static + repeat question이 누적되면 이탈 friction.

---

## 13. Code Changes

**NONE**

---

## 14. Observed Problems → Future Direction (CPO Review Input)

### P1 — Judgment does not update with Understanding

| | |
|---|---|
| **Observed Problem** | 4 turns, identical judgment text |
| **User Impact** | CEO feels AI is not synthesizing; consultant checklist |
| **Root Cause hypothesis** | `ai-pm-judgment-presenter` receives understanding changes but outputs generic gap-based template until specific gates met; competitor/correction events don't trigger judgment regeneration |
| **Proposed Future Direction** | Judgment must reflect last meaningful U change (correction, competitor input, payer gap) — minimum: one sentence delta per turn |

### P2 — Semantic cluster repeat (customer)

| | |
|---|---|
| **Observed Problem** | Customer asked after already stated in business one-liner |
| **User Impact** | ② signal — "already said why ask again" |
| **Root Cause hypothesis** | Gap engine advances by slot completeness, not semantic dedup from prior free-text answers |
| **Proposed Future Direction** | Pre-ask scan: if customer already in living understanding above threshold, skip or confirm-not-ask |

### P3 — Answer slot misrouting (competitor → solution)

| | |
|---|---|
| **Observed Problem** | Competitor answer stored under "제공 가치" |
| **User Impact** | ③ signal — question frame confusion; understanding quality degrades |
| **Root Cause hypothesis** | Active gap forces factKey regardless of CEO answer semantics |
| **Proposed Future Direction** | Intent-aware slot routing when answer content doesn't match ask gap (similar to CORRECT routing fix) |

### P4 — Research stub CEO-facing feedback

| | |
|---|---|
| **Observed Problem** | RESEARCH recognized but CEO still sees pending payer question dominantly |
| **User Impact** | ① signal partial fail at UX layer |
| **Root Cause hypothesis** | Stub panel secondary to question CTA; no "조사 중" primary state |
| **Proposed Future Direction** | Phase 3 Gate: RESEARCH → visible action state before resuming questions (CPO separate Gate) |

### P5 — Understanding copy artifacts

| | |
|---|---|
| **Observed Problem** | "문제: 문제:", "...입니다.입니다." |
| **User Impact** | Trust erosion in ④ signal moments |
| **Root Cause hypothesis** | Presenter concatenation without dedup/normalize |
| **Proposed Future Direction** | Copy sanitizer in focused presenter layer |

### P6 — Draft key naming

| | |
|---|---|
| **Observed Problem** | `launchlens.aiPmAnswerDraft.{projectId}` |
| **User Impact** | None functional; brand/consistency |
| **Root Cause hypothesis** | Legacy rename not applied |
| **Proposed Future Direction** | Rename to `alabom.aiPmAnswerDraft.{projectId}` with legacy read fallback |

---

## 15. CPO 판단 요청

**DAY 8-C Observation Report 제출.**

CPO Review에서 다음을 확정해 주세요:

1. **유지:** Focused UI, Correction semantic layer, Research routing, Persistence
2. **제거/완화:** Static judgment template, semantic repeat asks
3. **AI가 대신:** Research execution (별도 Gate), slot conflict detection, answer normalization
4. **CEO에게 물어야:** Strategic choices (payer, priority, GO/HOLD)
5. **재설계:** A-U-J-Q에서 **J layer** — Understanding 변화 → Judgment delta 연결

---

Next Autonomous Target  
Gate DAY 8-C / Observation Report submitted / CPO Review pending / 개발 동결 유지 / 다음 보고 08:00

AI는 Founder의 성공 확률을 높이기 위한 다음 개선을 계속 진행 중입니다.
