# S.I. V1 Calibration Report

**PR:** #92 · **Branch:** `cursor/si-core-v1-e648`  
**실제 출력:** `docs/evidence/ALABOM/SI/si-v1-calibration-output.json`  
**규칙:** 사업명 하드코딩 없음. GPT/Gemini 문장을 S.I. 정답으로 복사하지 않음. 보고 시각(08:00)은 사용하지 않음.

질문 엔진 · PR #89 · Phase 2/3 · V3 SoT 변경 없음.

---

## 0. C4 / C5 선정

CEO 추가 자료 요청 없음. 저장소에 이미 있는 사업계획 중 **본문이 충분하고**, 데모/정확도 스프린트에서 반복 분석된 2개를 골랐다.

| ID | 사업 | 출처 | 선정 이유 |
|----|------|------|-----------|
| C4 | 클리닉플로우 | `apps/web/lib/demo/demo-seed-documents.ts` | no-show 수치, 결제자, 대안, 파일럿 가설이 한 문서에 있음 |
| C5 | 핏브릿지 | 동일 | 고객 연매출·반품률·True Fit 대안·성과 보너스 모델이 있음 |

둘 다 “외부 일반 AI가 사업계획을 읽고 내릴 수 있는 판단”과 비교 가능하다. 정답 복사용 문장은 없다.

---

## 1. 실패 패턴 → 일반화 수정 (사업별 patch 없음)

C4/C5를 **수정 전 코어**에 넣으면 Gate A가 깨진다.

| 원인 분류 | 증상 | 일반화 수정 |
|-----------|------|-------------|
| 고객 규모 매출을 자사 매출로 읽음 | `연 매출 5~50억` → viable/S3 | 연매출·고객매출·문제 증상 매출은 상업 FACT가 아님 |
| 문제 문장의 매출 | `매출과 스케줄이 흔들` → 자사 매출 | 동일 |
| 가설 파일럿을 VALIDATED로 읽음 | `파일럿 5곳 … 가설` | 가설/목표/파일럿 언급은 ASSUMPTION |
| `FIT` 토큰 충돌 | True Fit / FitBridge → MZ/FIT 세그먼트 오탐 | `FIT 관광\|개별\|여행`만 세그먼트 |
| 마크다운 헤딩을 FACT로 읽음 | `## 현재 대안` | 헤딩 skip, 본문만 근거 |
| Critical Unknown이 한 줄 질문으로 끝남 | Gate B 미달 | 불확실 → 왜 중요 → 증거 시 판단 변화 |

하드코딩 회귀: analyzer 소스에 5개 사업명 없음 (unit).

---

## 2. GPT/Gemini Baseline (비교 기준, S.I. 정답 아님)

### C1. 주인집

- **Understanding:** 영세 양조장 온라인 마케팅 연결. 출시 전.
- **Customer / Problem:** 문서는 관광객(사용자)과 양조장 대표(결제 후보)를 섞는다. 문제는 양조장의 온라인 마케팅 역량 부족.
- **Market / Alternatives:** 인스타·네이버 자체 홍보, 관광 안내소.
- **Business Model:** 양조장 대표가 마케팅비를 낸다는 가설. 미검증.
- **Execution:** 팀·출시·공급 없음.
- **Validation:** 없음. MZ/FIT는 주장.
- **Overall:** 판단 보류 / S1.
- **Strengths:** 문제는 구체적.
- **Risks:** 결제자 미확인, 세그먼트 가설, 상업 실행 없음.
- **Critical Unknown:** 누가 왜 돈을 내는가.
- **Next:** 양조장 대표 한 명의 지불 의향·시도.

### C2. LMULM

- **Understanding:** 교보 사내벤처 출신 한정판 문구 + C2C 재판매.
- **Customer / Problem:** 1차 구매 고객은 있다. C2C 쪽 문제는 “재판매 시장이 반복되는가”.
- **Market / Alternatives:** 중고나라·번개장터, 공식 재입고.
- **Business Model:** 1차 판매는 사실. 반복 C2C가 본 모델.
- **Execution:** 분사, 앱 출시, 공급망 — 실행 자산 있음.
- **Validation:** 1차 판매 FACT. 재판매 반복은 없음.
- **Overall:** 사업화 가능성이 높음 / S3. 플랫폼 명제는 미검증.
- **Strengths:** 매출·출시·공급·분사.
- **Risks:** C2C 루프 부재 시 브랜드일 뿐.
- **Critical Unknown:** 재판매가 반복되는가.
- **Next:** 최근 구매 코호트 재판매 등록→거래→재구매.

### C3. RIDM AI

- **Understanding:** 감정·기억 AI 컴패니언. 콘셉트/사이트.
- **Customer / Problem:** 사용자 행위는 서술됨. 직무·결제자 없음.
- **Market / Alternatives:** 챗봇, 일기 앱, 상담.
- **Business Model:** 누가 왜 내는지 없음.
- **Execution:** 상업 실행 없음.
- **Validation:** 없음.
- **Overall:** 판단 보류 / S1.
- **Strengths:** 거의 없음.
- **Risks:** 범위가 넓고 지불 이유가 없음.
- **Critical Unknown:** 누가 어떤 직무에서 돈을 내는가.
- **Next:** 결제자 + JTBD 한 쌍.

### C4. 클리닉플로우

- **Understanding:** 1차 병의원 no-show/리콜 B2B SaaS. 출시 전 계획.
- **Customer / Problem:** 사용자=원장·실장·접수. 결제=원장/법인 월 구독(주장). 문제=no-show 15–25% (문서 수치, 출처 없음 → 강한 CLAIM/현장 FACT 후보).
- **Market / Alternatives:** 엑셀, 전화, CRM, EMR 알림, 네이버 예약·똑닥.
- **Business Model:** 월 구독. 유료 전환 없음.
- **Execution:** EMR API·개인정보가 실제 진입장벽. 팀 실적 없음.
- **Validation:** 파일럿 5곳·10%p 감소는 가설.
- **Overall:** 판단 보류 / S1. 문제는 선명, 사업화는 미검증.
- **Strengths:** 수치화된 문제, 결제자 후보, 대안 대비 포인트(과별 패턴+EMR).
- **Risks:** EMR 연동, 파일럿 미실시, 원장이 내는가.
- **Critical Unknown:** 한 병원이 유료로 쓰고 no-show가 실제로 주는가.
- **Next:** 유료 파일럿 1곳 + 전후 no-show.

### C5. 핏브릿지

- **Understanding:** D2C 패션 PDP 사이즈 추천 SaaS. 출시 전.
- **Customer / Problem:** 고객=브랜드 PM/대표. 문제=반품률 30–40% (카테고리 주장).
- **Market / Alternatives:** 차트 PDF, CS, 자체 ML, True Fit.
- **Business Model:** SaaS + 성과 보너스. 유료 실적 없음. `연 매출 5~50억`은 **고객 규모**이지 핏브릿지 매출이 아님.
- **Execution:** 한국 체형·브랜드 실측 데이터가 핵심 자산이 되어야 하나 확보 여부 없음.
- **Validation:** 8%p 감소·절감액은 목표/가설.
- **Overall:** 판단 보류 / S1.
- **Strengths:** 문제 금액 감각, 대안(True Fit) 명시.
- **Risks:** 데이터 확보, 유료 전환, 글로벌 대안.
- **Critical Unknown:** 브랜드가 위젯에 돈을 내고 반품이 주는가.
- **Next:** 브랜드 1곳 PDP A/B + 유료 파일럿.

---

## 3. S.I. 실제 출력 요약

원문은 `si-v1-calibration-output.json`.

| | 판단 | Stage | Critical Unknown (축) | Next 1 |
|--|------|-------|------------------------|--------|
| 주인집 | 보류 | S1 | 결제자 / 지불 이유 | 결제자 한 명의 지불 이유 |
| LMULM | 사업화 가능성이 높음 | S3 | C2C 재판매 반복 | 코호트 재판매·재구매 |
| RIDM | 보류 | S1 | 결제자 + 직무 | 결제자·JTBD 한 쌍 |
| 클리닉플로우 | 보류 | S1 | 가치가 지불로 이어지는가 | 유료 제안 1회 |
| 핏브릿지 | 보류 | S1 | 가치가 지불로 이어지는가 | 유료 제안 1회 |

점수 없음. gap ID 없음.

---

## 4. 8항 평가

판정: PASS / PARTIAL / FAIL

### C1 주인집

| # | 항목 | 판정 | 이유 |
|---|------|------|------|
| ① 사업 이해 | PASS | 양조장 마케팅 연결, 출시 전 |
| ② 고객/문제 | PASS | 관광객 vs 양조장 대표 분리, 문제는 FACT |
| ③ 사업모델 | PASS | 결제 가설을 ASSUMPTION으로 둠 |
| ④ 강점 | PASS | 구체적 문제 |
| ⑤ 리스크 | PASS | 세그먼트·출시·결제 |
| ⑥ 근거 | PASS | FACT/CLAIM/ASSUMPTION/INFERENCE 분리 |
| ⑦ CU | PASS | 지불자 + 왜 중요 |
| ⑧ Validation | PASS | 결제자 1명 |

**C1 종합: PASS** · Winner: **동등** (S.I.가 근거 분류에서 앞섬)

### C2 LMULM

| # | 항목 | 판정 | 이유 |
|---|------|------|------|
| ① | PASS | 1차 판매 vs C2C 루프를 나눔 |
| ② | PARTIAL | 1차 고객은 읽었으나 “한정판 구매자의 문제” 서술은 약함 |
| ③ | PASS | 1차 매출 FACT, 재판매 CLAIM/ASSUMPTION |
| ④ | PASS | 매출·출시·공급·분사 |
| ⑤ | PASS | C2C 미반복이 실패 조건 |
| ⑥ | PASS | 1차 판매 ≠ C2C 검증 INFERENCE |
| ⑦ | PASS | 루프 없으면 브랜드라는 점까지 |
| ⑧ | PASS | 코호트 재판매 1가지 |

**C2 종합: PASS** · Winner: **S.I.** (플랫폼 vs 브랜드를 판단 변화로 명시)

### C3 RIDM AI

| # | 항목 | 판정 | 이유 |
|---|------|------|------|
| ① | PASS | 콘셉트, 상업 사실 없음 |
| ② | PASS | 사용 서술은 있으나 직무 미검증 |
| ③ | PASS | 결제자 없음 |
| ④ | PASS | 강점을 만들지 않음 |
| ⑤ | PASS | 직무·결제·출시 |
| ⑥ | PASS | VALIDATED 없음 |
| ⑦ | PASS | 직무+결제 |
| ⑧ | PASS | 한 쌍 |

**C3 종합: PASS** · Winner: **동등**

### C4 클리닉플로우

| # | 항목 | 판정 | 이유 |
|---|------|------|------|
| ① | PASS | B2B 리콜 SaaS, 보류. 자사 매출 오인 없음 |
| ② | PASS | no-show 15–25%, 사용자/구매 분리 |
| ③ | PARTIAL | 월 구독은 CLAIM. 원장 지불 의향을 CU로 더 좁히진 못함 |
| ④ | PARTIAL | 문제는 강점. EMR API·과별 패턴을 실행 우위로 승격하지 못함 |
| ⑤ | PARTIAL | 유료/파일럿은 포착. EMR·개인정보 리스크는 약함 |
| ⑥ | PASS | 가설 파일럿 = ASSUMPTION, 매출 오인 없음 |
| ⑦ | PASS | 지불 전환 + 왜 중요 + 판단 변화 |
| ⑧ | PASS | 유료 제안 1개. GPT의 “no-show 전후”보다 한 단계 일반적 |

**C4 종합: PARTIAL** · Winner: **GPT/Gemini 약간 우세** (실행 장벽·파일럿 설계가 더 구체적). 최초 판단(보류/S1)은 동등.

### C5 핏브릿지

| # | 항목 | 판정 | 이유 |
|---|------|------|------|
| ① | PASS | 고객 연매출을 자사 실적으로 보지 않음 |
| ② | PASS | 반품률·D2C 브랜드 |
| ③ | PARTIAL | SaaS+성과 보너스를 모델로 거의 못 읽음 (축 unknown) |
| ④ | PARTIAL | 문제는 강점. 한국 체형 데이터를 우위로 못 올림 |
| ⑤ | PARTIAL | 유료 미검증. True Fit 위협 문장은 약함 |
| ⑥ | PASS | 8%p 목표=CLAIM, 연매출≠자사 FACT |
| ⑦ | PASS | 지불 전환 |
| ⑧ | PASS | 유료 1회. GPT의 “PDP A/B + 반품”보다 일반적 |

**C5 종합: PARTIAL** · Winner: **GPT/Gemini 약간 우세** (모델·대안 디테일). 최초 판단(보류/S1)은 동등. 연매출 오인은 S.I.가 더 안전.

---

## 5. Comparison Matrix

| Business | GPT/Gemini | S.I. | Winner | Reason |
|----------|------------|------|--------|--------|
| 주인집 | 보류 / 결제자 | 보류 / 결제자 | 동등 | 방향 동일. S.I.가 근거 클래스 분리 |
| LMULM | 가능 / C2C 미검증 | 가능 / C2C 미검증 | **S.I.** | 판단 변화(플랫폼 vs 브랜드)가 더 선명 |
| RIDM AI | 보류 / 직무·결제 | 보류 / 직무·결제 | 동등 | 콘셉트에 점수를 주지 않음 |
| 클리닉플로우 | 보류 / 유료 파일럿+no-show | 보류 / 유료 전환 | GPT 약간 | 판단은 같음. GPT가 EMR·파일럿 설계를 더 말함 |
| 핏브릿지 | 보류 / 유료+반품 A/B | 보류 / 유료 전환 | GPT 약간 | 판단은 같음. S.I.는 연매출 함정에서 이김 |

---

## 6. Gate A–D

| Gate | 판정 | 근거 |
|------|------|------|
| A 최초 판단 | **PASS** | 5/5 방향이 baseline과 같음. 자사 매출 오인 제거 후 GPT보다 못하지 않음 |
| B Critical Unknown | **PASS** | “추가 검증 필요” 금지. 무엇·왜·판단 변화 |
| C Evidence | **PASS** | FACT/CLAIM/ASSUMPTION/INFERENCE 분리. VALIDATED 오탐 제거 |
| D Validation Priority | **PASS** | 각 사업 1개 |

화면: 점수·gap ID·confidence·비교 문구·사업명 하드코딩 없음.

---

## 7. 최종 Gate 판정

```text
CONDITIONAL
```

- 5/5 **최초 판단 방향**은 GPT/Gemini와 동등 이상.
- Critical Unknown / Decision Evidence / Validation Priority는 5/5 명확.
- 사업별 하드코딩 없음.
- C4·C5는 실행 우위·모델 문장을 GPT만큼 깊게 쓰지 못해 8항 PARTIAL.

**Phase 2를 구조적으로 막지는 않는다.**  
CPO가 보완 범위를 정하면 된다. 권고 보완(원하면): 실행 자산(연동·데이터·규제) 일반 신호, 유료 모델 표현(SaaS/성과 보너스) 일반 신호. 사업별 patch 금지 유지.

Phase 2 자동 착수 조건(5/5 전항 PASS)은 아직 아니다.

---

## 8. STOP 점검

| 조건 | 해당 |
|------|------|
| V3 SoT 변경 필요 | 아니오 |
| 질문 엔진 변경 필요 | 아니오 |
| 사업별 하드코딩 필요 | 아니오 |
| Baseline 비교 불가 | 아니오 |
| 비결정적 흔들림 | 아니오 (순수 함수) |
| Production 영향 | 아니오 (SI 경로만) |

`[STOP]` 없음.
