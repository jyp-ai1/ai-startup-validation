# ALABOM Demo / My Business / Production — CTO STEP 1 (설계만, 구현 전)

**Status:** CPO 1차 검토용 · **코드 변경 없음**  
**Date:** 2026-10-01 UTC  
**Prior art:** P0-3 A/C CLOSED on `820482a` (My Business **경로** integrity — Sample 구조 분리는 본 설계에서 완성)  
**V3 SoT:** `gap-question-map.ts`, `decideNextQuestionFromReview`, `evaluateStageReadiness`, Stage A/B fieldKeys (변경 없음)

---

## 0. 목표 요약 (3 레이어)

```text
ALABOM CORE (동일 Understanding / Review / Gap / Judgment 파이프라인)
        │
   ┌────┴────┐
 DEMO                    PRODUCTION
   │
   ├─ ① DEMO_SAMPLE      — DB seed, 프레임 재생, [다음 →] UX
   └─ ② DEMO_MY_BUSINESS — 실입력/문서, Extraction → Preview (Judgment 미완주)
```

**원칙**

| # | 원칙 |
|---|------|
| 1 | Sample 데이터 **코드 하드코딩 금지** → seed/DB |
| 2 | Sample / My Business / Production **storage·session·projectId 분리** |
| 3 | 실패 시 **샘플 fallback 금지** (명시적 실패 UX) |
| 4 | Demo Sample은 **사전 구축 state 재생**, 동일 Core Engine |
| 5 | V3 엔진 **우회·재작성 금지** |

---

# ① Demo Scenario Map (Sample × 3)

공통: 각 Sample은 **독립 `demo_project_id`**, **독립 playback session namespace**, 동일 V3 gap 순서(Stage A → Stage B → Judgment → Final Review).

### V3 Stage 매핑 (고정)

| Stage | targetGap (fieldKey) | 대표 질문 (SoT) |
|-------|----------------------|-----------------|
| A | `businessOneLiner` | 이 사업은 누구에게 무엇을 제공하나요? |
| A | `customerPersona` | 이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요? |
| A | `payer` | 서비스 비용은 누가 지불하나요? |
| A | `problemJtbd` | 지금 가장 크게 해결하려는 불편은 무엇인가요? |
| B | `marketChannel` | 고객·수요를 검증할 채널은 어디인가요? |
| B | `alternativesCompetitors` | 비슷한 역할을 이미 하고 있는 서비스가 있나요? |
| B | `differentiationVsAlternatives` | 경쟁 대비 이 서비스만의 차별점은 무엇인가요? |
| B | `validationTestability` | 그 차별점이 고객에게 왜 중요한가요? / 검증 가능성 |

Playback 프레임은 **CEO 6 Surfaces**만 노출: 이해 · 질문 · 확정 · 판단 · 이유 · (Final) 확정.

---

## Demo A — B2B SaaS · 「클리닉플로우」

**유형:** 병원·의원 운영팀 대상 예약·리콜 자동화 SaaS (SmartPM과 무관한 독립 서사)

| 필드 | 내용 |
|------|------|
| 사업명 | 클리nic플로우 (ClinicFlow) |
| 한 줄 | 외래·검진 예약 no-show를 줄이는 B2B SaaS |
| 상세 | 1~3개월 전환 리콜, 카카오/SMS 리마인더, EMR 연동 API, 대시보드 |
| 고객 | 5~30인 규모 피부과·치과·한의원 원장 및 실장 |
| 구매자 | 원장 또는 병원 법인 (월 구독 결제) |
| 문제 | 전화 예약·수기 리콜로 no-show 15~25%, 매출 손실 |
| 현재 해결 | 수기 엑셀, 간호사가 전화, 일반 CRM |
| 시장 | 국내 1차 진료과·검진센터 디지털 전환 |
| 경쟁/대체 | 네이버 예약, 똑닥, 자체 EMR 알림, Peopleworks CRM |
| 차별화 | **진료과별 no-show 패턴** 기반 자동 리콜 시나리오 + EMR 연동 |
| 검증 | 파일럿 5곳, no-show율 전후, 월 구독 전환 |
| 핵심 가설 | no-show 10%p 감소 시 ROI 3개월 내 회수 |

**Playback 프레임 (요약 — seed에 full copy 저장)**

| Frame | UX | 내부 (비노출) |
|-------|-----|----------------|
| 0 | 사업 문서 「이미 입력됨」 스크롤 | `canonical_document` |
| 1 | AI Understanding 카드 + ✓ 맞습니다 | `understanding_snapshot` |
| 2–5 | 질문 + **미리 채워진 CEO 답변** + [다음 →] | turns[0..3] Stage A |
| 6–9 | Stage B 질문 + [다음 →] | turns[4..7] |
| 10 | Judgment (6 Surface) | `ceo_judgment` |
| 11 | Final Review | `final_review_snapshot` |

**사전 등록 Q/A (예시 1턴)**

- **Ask:** `customerPersona` — 「이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?」  
- **Answer (seed):** 「5~30인 피부과·치과 원장. 직접 진료하면서 예약 관리까지 하는 경우가 많습니다.」  
- **After:** gapState.customerPersona = confirmed, living summary 갱신 (seed JSON)

---

## Demo B — Local / Consumer · 「동네장터알림」

**유형:** 동네 음식점·카페 SNS 홍보 자동화 (CEO P0-3 custom 시나리오와 정합)

| 필드 | 내용 |
|------|------|
| 사업명 | 동네장터알림 |
| 한 줄 | 직원 5명 이하 음식점의 SNS·네이버 플레이스 홍보 자동화 |
| 상세 | 메뉴/재고 입력 → 주 3회 포스팅 초안, 플레이스 리뷰 답글 템플릿 |
| 고객 | 서울·수도권 **직원 5명 이하** 음식점 사장 |
| 구매자 | 사장 개인 (월 9.9만 원 구독) |
| 문제 | 홍보 시간 없음, 전문성 부족, 이벤트 공지 누락 |
| 현재 해결 | 지인 대행, 프리랜서, 무작위 ChatGPT |
| 시장 | 전국 소상공인 디지털 마케팅 |
| 경쟁 | 마케터 대행, Canva, 네이버 스마트플레이스 단독 |
| 차별화 | **업종별 템플릿 + 지역 키워드** + 게시 일정 자동 |
| 검증 | 20곳 파일럿, 게시 유지율, 신규 리뷰 수 |
| 핵심 가설 | 사장 주 2시간 → 10분으로 홍보 운영 |

동일 프레임 구조; **문서 길이 ≥ 800자** full `canonical_document` in seed (1~2줄 금지).

---

## Demo C — Commerce / Brand · 「핏브릿지」

**유형:** D2C 지속가능 의류 · AI 사이즈 추천

| 필드 | 내용 |
|------|------|
| 사업명 | 핏브릿지 (FitBridge) |
| 한 줄 | 반품률 높은 D2C 브랜드를 위한 AI 사이즈·핏 추천 |
| 상세 | 구매 전 설문+과거 반품 데이터, PDP 위젯, 브랜드 SaaS |
| 고객 | 연 매출 5~50억 D2C 의류·신발 브랜드 PM/대표 |
| 구매자 | 브랜드 법인 (SaaS + 성과 보너스) |
| 문제 | 사이즈 반품 30~40%, 마진 악화 |
| 현재 해결 | 사이즈 차트 PDF, CS 수동 안내 |
| 시장 | 국내 D2C 패션 SaaS |
| 경쟁 | True Fit, 사내 ML, 단순 추천 위젯 |
| 차별화 | **한국 체형·브랜드별 실측** 학습 + 반품 SLA 연동 |
| 검증 | A/B PDP, 반품률 8%p 목표 |
| 핵심 가설 | 반품 1%p = 연 수천만 원 절감 |

---

## Sample 간 격리 (시나리오)

| Test | 기대 |
|------|------|
| A → B 전환 | B 문서/고객/문제 **A 잔재 0** |
| B refresh | B state 유지 |
| C parallel tab | A/B storage **미접촉** |

---

# ② Demo DB / Seed Schema

**목표:** 개발자가 코드 수정 없이 Sample 추가·교체 (3 → 5 → 10).

### 논리 모델

```text
demo_project                    -- 1 row per Sample (A/B/C)
demo_project_document           -- canonical_document (full text)
demo_project_business_context   -- structured fields (JSON)
demo_scenario_frame             -- ordered playback frames
demo_scenario_turn              -- prebuilt Q/A + review artifacts (optional per frame)
demo_scenario_gap_state         -- gapState snapshot per frame
demo_scenario_judgment          -- ceoJudgment per frame
demo_scenario_final_review      -- terminal frame only
```

### TypeScript seed shape (packages/types 또는 seed module)

```typescript
/** @repo/types/demo-scenario */
export type DemoProjectKind = 'DEMO_SAMPLE' | 'DEMO_MY_BUSINESS_SESSION';

export type DemoProjectRecord = {
  id: string;                    // e.g. demo-sample-clinicflow
  slug: 'clinicflow' | 'local-sns' | 'fitbridge';
  displayName: string;
  tagline: string;
  category: 'b2b_saas' | 'local_service' | 'commerce_brand';
  version: number;               // seed bump
  locale: 'ko';
};

export type DemoBusinessContext = {
  businessName: string;
  oneLiner: string;
  longDescription: string;
  customer: string;
  payer: string;
  problem: string;
  currentAlternatives: string;
  market: string;
  competitors: string;
  differentiation: string;
  validationPlan: string;
  coreHypothesis: string;
};

export type DemoScenarioFrame = {
  index: number;                 // 0..N monotonic
  stepLabel: string;             // CEO-facing only, e.g. "고객 확인"
  surface: 'understanding' | 'question' | 'judgment' | 'final_review';
  /** Hydrate into workspace cache — same shape as WorkspacePersistedSnapshot subset */
  workspaceSnapshot: {
    documentText: string;
    understandingPhase: string;
    aiPmLoop: import('@repo/types').AiPmLoopState; // versioned
    conversationMemory?: unknown;
    gapState?: unknown;
  };
  /** CEO-visible copy overrides (no targetGap/score in UI) */
  presenter: {
    understandingSummary?: string;
    questionText?: string;
    prefilledAnswerDisplay?: string;  // Sample: show as "이미 확인된 답변"
    judgmentHeadline?: string;
    finalReviewSummary?: string;
  };
  primaryCta: 'next' | 'confirm_understanding' | 'start_preview';
};

export type DemoSeedBundle = {
  project: DemoProjectRecord;
  business: DemoBusinessContext;
  document: { format: 'markdown'; body: string };
  frames: DemoScenarioFrame[];
};
```

### Storage / runtime (설계)

| Layer | DEMO_SAMPLE | DEMO_MY_BUSINESS | PRODUCTION |
|-------|-------------|------------------|------------|
| DB | `demo_project*` read-only seed (+ optional Supabase `demo_projects`) | no long-term DB | `startup_projects` |
| Session prefix | `demo.sample.{slug}.` | `demo.mybusiness.{sessionId}.` | `project.{uuid}.` |
| projectId | `demo-sample-{slug}` | `demo-my-{uuid}` | real UUID |
| Engine | **Playback controller** hydrates snapshot → **same** V3 UI | **Live** extraction + Preview cap | **Live** full journey |

**Seed 파일 위치 (구현 STEP 2)**

```text
packages/db/seed/demo-projects/
  clinicflow.seed.json
  local-sns.seed.json
  fitbridge.seed.json
  index.ts                 -- register all bundles
```

또는 `apps/web/lib/demo/seed/` — 단 **런타임 import of document text 금지**, JSON/YAML + migration loader.

### Playback vs Live

```text
[Sample] User taps Next
    → frameIndex++
    → load demo_scenario_frame[index].workspaceSnapshot
    → applyWorkspaceSnapshotToCache(demo-sample-{slug}, snapshot)
    → UI renders (same components as Production)

[My Business] User submits doc
    → extractDocumentEntities + buildBusinessUnderstanding (live)
    → stop at Preview frame (no auto Judgment)
```

---

# ③ My Business Preview Flow

```text
Landing /demo/start
    │
    ├─ [Sample Project 체험] ──→ pick A|B|C ──→ Playback (①)
    │
    └─ [내 사업으로 체험하기] ──→ DEMO_MY_BUSINESS
              │
              ├─ Input: 사업내용 textarea (≥ analyzable threshold)
              ├─ Upload: PDF/DOCX (실패 시 explicit error, NO sample fallback)
              │
              ├─ Trust: "문서 분석 중" / "AI PM이 사업을 읽고 있습니다"
              │
              ├─ Extraction (live, same as Production)
              │     → Business / Customer / Problem / Payer (best effort)
              │
              ├─ Surface: "현재 이해" + "추가로 확인이 필요한 내용"
              │
              ├─ AI PM Preview (1~2 representative asks OR static preview copy)
              │     — **does NOT** run full Stage B / Judgment / Final Review
              │
              └─ CTA: Google Login → promote to Production project (existing promote path)
```

### P0 integrity checks (My Business)

| # | Rule |
|---|------|
| MB-1 | `canonical_document` = user paste or extracted file text only |
| MB-2 | No read from `demo_project` / SmartPM / `DEMO_SAMPLES` |
| MB-3 | Extraction fail → UI error, retry upload — **not** `[Sample]` hidden mock |
| MB-4 | Session keys **never** share `demo.sample.*` |
| MB-5 | Two different inputs → different Business/Customer/Problem (CEO test) |

### Preview boundary (명시)

| In Preview | Out of Preview (Production only) |
|------------|----------------------------------|
| Document read + Understanding spine | Full gap loop completion |
| 1 optional demo question OR "다음 단계는 로그인 후" | Judgment + Final Review |
| Login CTA | DB persistence (until promote) |

---

# ④ Production Scenario Map vs 현재 구현

## 4-1. 정의된 Production Journey (V3 SoT)

| Step | 사용자 Action | AI 처리 | 상태 | 사용자에게 보임 | 다음 |
|------|---------------|---------|------|-----------------|------|
| P0 Landing | CTA | — | — | 스토리 | Workspace |
| P1 Project create | 제목·유형·설명/문서 | `buildAuthProjectIntakeContent` | DB `onboardingContext.v2Demo.pastedContent` | intake form | `/workspace?project=&welcome=1` |
| P2 Seed hydrate | enter workspace | `extractProjectSeedDocument` → session cache | document in sessionStorage | (collapsible 원문) | Reading |
| P3 Reading | continue | `buildBusinessUnderstanding` | loop `readingCompleted` | Trust / Reading UX | Understanding confirm |
| P4 Understanding | ✓ 맞습니다 / 수정 | confirm → `commitFirstAsk…` (820482a) | phase accepted, lock | Shared Understanding | Q1 |
| P5 Loop turn | 답변 | Answer→Review→gapState→decideNext | turns[], lastDecision | 질문 Surface | Qn+1 |
| P6 Stage gate | (implicit) | evaluateStageReadiness | gap open/closed | (내부 비노출) | Stage B |
| P7 Judgment | view / supplement | ceoJudgment, business review | viewMode judgment | 판단 Surface | Final or supplement |
| P8 Final Review | confirm | final integrity gate | review-ready | Final Understanding | Analysis / Next action |
| P9 Persist | refresh | `onboardingContext.v2Workspace` | DB snapshot | resume | — |

Pipeline (고정):

```text
Answer → buildAnswerReview → gapVerdicts → updateGapStateFromReview
  → gapState → evaluateStageReadiness → decideNextQuestionFromReview
  → lastDecision → CEO 6 Surfaces → hydrate/remount
```

## 4-2. Gap table — 정의 vs 구현

| Area | 정의 (목표) | 현재 구현 | Gap |
|------|-------------|-----------|-----|
| **Demo Sample data** | DB/seed bundles, 3 rich projects | `demo-samples.ts` inline strings (incl. SmartPM saas) | 🔴 P0 — replace with seed |
| **Demo Sample UX** | Next-only playback | Real-time V3 loop OR short paste | 🔴 P0 — playback controller |
| **Demo Sample count** | 3 distinct architectures | 5 presets + launchlens + custom | 🟡 consolidate to 3 seeded |
| **State separation** | SAMPLE / MY_BUSINESS / PRODUCTION keys | Single `DEMO_SESSION_PROJECT_ID` + shared session keys for all guided | 🔴 P0 |
| **My Business** | Preview-only boundary | Full loop possible in `demo-guided` custom | 🟡 cap at Preview |
| **My Business integrity** | No sample fallback | P0-3A guard on hydration (820482a) | 🟢 partial — structural split still needed |
| **Production intake** | Full pastedContent | ✅ v2Demo.pastedContent | 🟢 |
| **Production loop** | V3 review pipeline | ✅ active in prod | 🟢 |
| **Production persist** | v2Workspace snapshot | ✅ (Auth gate separate) | 🟡 Auth/Supabase BLOCKED |
| **CEO surfaces** | No targetGap/score | Mostly hidden; some debug/test ids | 🟡 audit UI |
| **Legacy Demo 9-step** | N/A (superseded by this spec) | `v2-demo-experience-data.ts` parallel | 🟡 deprecate or bridge |
| **Document fail** | Explicit error | PDF placeholder path exists | 🟡 ensure no silent sample |

## 4-3. SmartPM / 오염 — 구조적 해결 (임시 fallback 금지)

| 현재 | 목표 |
|------|------|
| `getDemoSample('saas')` document = SmartPM literal | Demo A/B/C **only** from seed slugs; **deprecate** inline saas |
| custom + sample share hydration effect | **Separate routes:** `/demo/sample/{slug}` vs `/demo/my-business` |
| P0-3 idempotent guard | Remains **My Business** safety net, not Sample architecture |

---

# Implementation order (CPO 승인 후)

| STEP | 내용 | 본 문서 |
|------|------|---------|
| 1 | Scenario + Schema + Maps | ✅ 본 제출물 |
| 2 | Seed JSON 3종 + loader | 대기 |
| 3 | Sample Playback UI | 대기 |
| 4 | My Business Preview cap | 대기 |
| 5 | State isolation refactor | 대기 |
| 6 | Production scenario doc (운영) | §4-1 |
| 7 | Gap list only — **no code** until CPO | §4-2 |

---

# Acceptance Criteria trace (설계 대응)

| AC | STEP 1 대응 |
|----|-------------|
| A.1 3 Sample | Demo A/B/C 정의 |
| A.2 Rich data | business context + long document spec |
| A.3 DB/seed | §② schema |
| A.4 Independent state | §② storage table |
| A.5 Real question flow | V3 gap bindings referenced |
| A.6 Next UX | frame.primaryCta = `next` |
| A.7–8 Judgment/Final | frames 10–11 |
| B.* My Business | §③ |
| C.* Production | §④ |

---

# CTO 1차 결론

1. **구현 착수 전 CPO 승인 필요:** Sample 3종 서사, seed schema, My Business Preview 경계, Production gap 표.  
2. **P0-3 A/C는 My Business 경로 무결성** — 본 설계의 **State separation + seed Sample**으로 SmartPM 클래스 문제를 **구조적으로** 제거.  
3. **CEO 테스트:** 본 STEP 1 단계에서는 **요청하지 않음** (CPO 지시 준수).

**Next (after CPO):** STEP 2 seed JSON 작성 → STEP 3 Playback MVP (Demo A 1종) → Production smoke.
