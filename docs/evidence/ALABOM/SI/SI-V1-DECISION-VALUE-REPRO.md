# [ACCURACY BATCH COMPLETE] Founder Decision Value after #134

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge/Production 금지  
**대상 SHA:** #137 `e7e6dd3` (engine = Production `0b46522`)  
**Preview:** https://ai-startup-validation-git-cursor-si-dv-394f6e-jyp-ai1s-projects.vercel.app  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-decision-value-repro.json`

#134 `spoken_generic_after_promotion` Fix 이후 Founder Decision Value가 실제로 개선됐는지 잰다. Analyzer · Judgment · classifier · SoT · Question Engine은 고치지 않았다.

## 규모

시나리오 **11**. 이름 없는 8사업군 2/2 + C2C 재판매 t0 + 결제자 분리 + 직무 CU.

## 축 집계

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **11** | 0 | 0 |
| CU | **11** | 0 | 0 |
| DCE | **11** | 0 | 0 |
| Question Alignment | **11** | 0 | 0 |
| Founder Decision Value | **11** | 0 | 0 |
| generic-after-promotion | **0** | — | — |

Failure cluster: **없음**.

## 시나리오 표

| 사업군 | t0 Judgment | t0 CU | t0 DCE | 승격 조건 | 승격 후 CU | whyAsking | spoken question | Generic | DV | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|
| B2B 물류 | 보류 · 누락 전후 미검증 | 유료 사용 후 누락이 줄었는가 | 유료 파일럿 1건 + 누락 전후 | 결제 3명 + 누락 14%→6% | 다음 고객/기간 같은 방향 | 다음 고객/기간 유지 | 다음 고객 또는 다음 기간에서 같은 성과가 유지된 경우가 있습니까? | No | PASS | — |
| D2C 의류 | 보류 · 반품률 전후 미검증 | 유료 사용 후 반품률이 줄었는가 | 유료 파일럿 + 반품 전후 | 결제 2명 + 반품률 32%→20% | 다음 고객/기간 | 다음 고객/기간 유지 | 같은 성과 유지 질문 | No | PASS | — |
| B2B 고객지원 | 보류 · 부하 전후 미검증 | 유료 사용 후 부하가 줄었는가 | 유료 파일럿 + 부하 전후 | 결제 4명 + 부하 41%→19% | 다음 고객/기간 | 다음 고객/기간 유지 | 같은 성과 유지 질문 | No | PASS | — |
| 중고 카탈로그 | 보류 · 미스매치 전후 미검증 | 유료 사용 후 미스매치가 줄었는가 | 유료 파일럿 + 미스매치 전후 | 결제 2명 + 미스매치 22%→10% | 다음 고객/기간 | 다음 고객/기간 유지 | 같은 성과 유지 질문 | No | PASS | — |
| 병원 청구 | 보류 · 불일치 전후 미검증 | 유료 사용 후 불일치가 줄었는가 | 유료 파일럿 + 불일치 전후 | 결제 6명 + 불일치 19%→8% | 다음 고객/기간 | 다음 고객/기간 유지 | 같은 성과 유지 질문 | No | PASS | — |
| 동네 의원 | 보류 · no-show 전후 미검증 | 유료 사용 후 no-show가 줄었는가 | 유료 파일럿 + no-show 전후 | 결제 3명 + no-show 22%→12% | 다음 고객/기간 | 다음 고객/기간 유지 | 같은 성과 유지 질문 | No | PASS | — |
| B2B 온보딩 | 보류 · 이탈 전후 미검증 | 유료 사용 후 이탈이 줄었는가 | 유료 파일럿 + 이탈 전후 | 결제 4명 + 이탈 37%→21% | 다음 고객/기간 | 다음 고객/기간 유지 | 같은 성과 유지 질문 | No | PASS | — |
| 식품 창고 | 보류 · 누락 전후 미검증 | 유료 사용 후 누락이 줄었는가 | 유료 파일럿 + 누락 전후 | 결제 5명 + 누락 11%→4% | 다음 고객/기간 | 다음 고객/기간 유지 | 같은 성과 유지 질문 | No | PASS | — |
| C2C 재판매 | 조건부 가능 · 재판매 루프 미검증 | C2C 재판매가 반복되는가 | 재판매 등록·거래·재구매 | t0 (1차 판매 이미 있음) | — | 재판매 데이터 | 재판매 등록·거래 체결·재구매 | No | PASS | 다른 CU |
| 양조장 마케팅 | 보류 · 결제자/직무 미검증 | 누가 어떤 직무를 대체하며 왜 돈을 내는가 | 결제자 1명 실지불 | 결제자 3명 마케팅비 | 반복 가능 | 두 번째 계약·관광 수요 | 두 번째 계약이나 반복되는 관광 수요 | No | PASS | P1-A 축 유지 |
| 감정 기록 컴패니언 | 보류 · 결제자/직무 미검증 | 누가 어떤 직무를 대체하며 왜 돈을 내는가 | 결제자 1명 실지불 | 결제 1명 + 직무 대체 | 반복 가능 | 두 번째 행동·반복성 | 두 번째 행동이나 반복 사용 | No | PASS | — |

전문 문장은 dump에 있다.

## 핵심 검증

1. t0 리스크/검증축: 8/8 스테이크(누락·반품·부하·미스매치·불일치·no-show·이탈) + 3 extra CU 정확  
2. DCE 충족 후 CU 이동: 8/8 `paid_conversion` → `next_period`. extra는 `payer_job` → `repeat_loop` 또는 C2C `resale` 유지  
3. 이동한 CU가 spoken에 반영: 11/11  
4. whyAsking ↔ spoken 축 일치: 11/11  
5. 질문만 보고 다음 검증을 알 수 있음: 11/11  
6. generic 후퇴: **0**  
7. 사업명 하드코딩: analyzer / presenter / classifier / referee **없음**

## Regression

| Gate | 결과 |
|---|---|
| #104 payment-only off S3 | PASS (`si-negative-judgment` · `si-evidence-reconciliation` · `si-stale-cu`) |
| #107 2/2 next-unknown CU | PASS |
| P1-A 4축 | PASS 4 |
| P1-C · quantity-unit | PASS 5 + 5 |
| P0-1 | PASS 8 |
| P0-2 | PASS 5 |

Regression 8 files / 46 passed. Dump 재작성분은 restore.

## Fix Gate

**HOLD.** 구조적 FAIL 반복 없음. 단일 PARTIAL도 없음. Founder Decision Value를 저해하는 클러스터가 없다.

## 미변경

Analyzer · Judgment · Evidence classifier · SoT · Question Engine · Auth · `#127` · `#129` · `#131` · Production `0b46522`

CEO Founder Test 없음.
