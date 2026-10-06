# S.I. V1 Calibration — 주인집 / LMULM / RIDM AI

**Branch:** `cursor/si-core-v1-e648`  
**Analyzer:** `apps/web/features/strategic-intelligence/lib/analyze-strategic-intelligence.ts`  
**Fixtures:** `apps/web/features/strategic-intelligence/lib/si-calibration-cases.ts`  
**Snapshot:** `docs/evidence/ALABOM/si-v1-calibration-output.json`  
**Rule:** analyzer has no brand-name branches. Quality is judged by general evidence → axis → stage → prose verdict.

## Gate

주인집 / LMULM / RIDM AI를 넣었을 때 최초 사업성 판단이 점수 없이 나오고, Critical Unknown과 판단을 바꾸는 증거가 명확해야 한다. 이 게이트를 통과한 뒤에만 AI PM 연결(Phase 3)로 간다.

## Actual first judgments

### 주인집 — `judgment_deferred` · S1

- **현재 판단:** 지금은 판단을 보류한다. 사용자와 결제자가 분리되어 있어 지불 이유가 따로 검증되지 않았다.
- **왜 가능한가:** 문서에서 확인할 수 있는 구체적 문제가 있다.
- **왜 실패할 수 있는가:** 결제자 미검증 · MZ/FIT 가설 · 출시·매출 없음.
- **Critical Unknown:** 실제 돈을 내는 사람이 누구이며, 그 사람이 이 문제를 비용으로 해결할 이유가 있는가.
- **판단을 바꿀 증거:** 결제 후보의 지불 의향 인터뷰와 실제 지불 시도(견적·계약·선결제).
- **다음 1개:** 사용자와 결제자를 분리해, 결제자 한 명의 지불 이유를 확인한다.

### LMULM — `viable` · S3

- **현재 판단:** 사업화 가능성이 높음. 핵심 근거: 실제 판매·매출 증거가 있다. 핵심 리스크: C2C 재판매가 반복적으로 발생하는지 확인되지 않았다.
- **왜 가능한가:** 실제 매출·공급망·고객 구매가 존재한다.
- **왜 실패할 수 있는가:** C2C 재판매가 반복적으로 발생하는지 확인되지 않았다.
- **Critical Unknown:** C2C 재판매가 한 번의 이벤트가 아니라 반복적으로 발생하는가.
- **판단을 바꿀 증거:** 최근 구매자의 실제 재판매 등록·거래·재구매 데이터.
- **다음 1개:** 최근 구매 코호트의 재판매 등록·체결·재구매 여부 한 가지를 확인한다.

### RIDM AI — `judgment_deferred` · S1

- **현재 판단:** 지금은 판단을 보류한다. 결제자가 확인되지 않았다. 누가 어떤 직무를 이 제품으로 대체하며, 왜 돈을 내는가.
- **왜 가능한가:** 지금은 가능성을 뒷받침할 상업 사실이 거의 없다.
- **왜 실패할 수 있는가:** 결제자 미확인 · 직무 미검증 · 출시·매출 없음.
- **Critical Unknown:** 누가 어떤 직무를 이 제품으로 대체하며, 왜 돈을 내는가.
- **판단을 바꿀 증거:** 구체적 사용 상황에서 결제자 한 명이 실제로 지불하거나 유료 사용을 시작한 증거.
- **다음 1개:** 결제자와 Job-to-be-done을 한 쌍으로 확인한다.

## Evidence classes

모든 근거는 FACT / CLAIM / INFERENCE / ASSUMPTION / VALIDATED 로 분리한다. 점수(78점 등)는 출력하지 않는다.

## Out of scope

Question engine, PR #89, persist SoT, Phase 2 evidence update, Phase 3 AI PM bind.
