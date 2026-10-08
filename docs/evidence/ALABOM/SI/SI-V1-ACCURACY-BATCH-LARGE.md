# [ACCURACY BATCH COMPLETE] Judgment chain across 10 business types

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**PR:** #139 · **SHA:** `f9bee12` · Draft  
**Preview:** https://ai-startup-validation-git-cursor-si-ac-95a338-jyp-ai1s-projects.vercel.app  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-batch-large.json`  
**CEO Founder Test:** 없음

사업 이해 → 판단 → CU → DCE → 질문 → 답 → Evidence → Re-Judgment를 10유형 × 15장면으로 잰다. 엔진은 고치지 않았다.

## 규모

| | |
|---|---|
| 사업 유형 | 10 (SaaS/구독 · B2B · B2C · 플랫폼 · 커머스 · 오프라인 · 의료/병원 · 관광/지역 · AI 서비스 · 마켓플레이스) |
| 장면 | 15 (t0 · 부족 · 다중사실 · 계획 · 2/2 · 부분 · 악화 · 직접부정 · 충돌 · 반복0 · 반복성공 · 다른축 · 동일답 반복 · 모호 · 과대주장) |
| 총 시나리오 | **150** |

## 축 집계

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **149** | 1 | **0** |
| Evidence | **147** | 3 | **0** |
| CU | **150** | 0 | **0** |
| Question Alignment | **127** | 23 | **0** |
| Founder Decision Value | **125** | 25 | **0** |
| 종합 | **124** | 26 | **0** |

generic-after-promotion (2/2): **0**

## 반복 관찰 (Fix 아님)

| Failure Type | 수 | 의미 |
|---|---|---|
| `missed_downgrade` | 3 | 플랫폼 충돌 · 관광 충돌 · 관광 반복0. 매출/1회 성과 headline이 남고 CU는 정직하다 |
| Question Alignment PARTIAL | 23 | 축은 닫히지 않음. spoken이 CU보다 넓거나 관광/직무 겹침 |
| 그 외 FAIL 클러스터 | **없음** | stale CU · generic-after-promotion · plan→VALIDATED · axis_drift 0 |

대표 행은 dump에 있다. CPO 표 필드(Business Type · Initial Judgment · CU · DCE · Question · Answer · Evidence · Re-Judgment · Next CU · Next Question · DV · Failure Type) 150행 전부 dump.

## 원칙이 살아남은 곳

- 10유형 t0가 스테이크/직무/재판매를 혼동하지 않는다
- 2/2 후 CU가 다음 기간 또는 반복 축으로 이동하고 spoken이 따라간다
- 계획/의도는 VALIDATED가 아니다
- 지불만으로 스테이크 CU를 닫지 않는다
- 사업명 분기 없음

## Regression

#104 · #107 · P1-A · P1-C · P0-1 · P0-2 · spoken-generic-fix → 8 files / 47 passed.

## Fix Gate

**HOLD.** FAIL 0. `missed_downgrade` 3은 서로 다른 사업에서 보이지만 verdict를 오승격하지 않고 CU가 열린 채다. Founder Decision Value FAIL 0. 단일 구조로 Fix를 열지 않는다.

## 미변경

Analyzer · Judgment · classifier · Presenter · SoT · Auth · Production `0b46522`
