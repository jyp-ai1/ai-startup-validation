# [ACCURACY BATCH COMPLETE] Holdout — 10 new types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout.json`  
**CEO Founder Test:** 없음

#139와 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

교육/학원 · 피트니스 · 부동산 중개 · 음식점 · 제조 · 라스트마일 · 구독 미디어 · 프리랜서 마켓 · 펫케어 · 홈서비스  
15장면 × 10 = **150**. 누적( #139 150 + holdout 150 ) = **300**.

## 축 집계

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **150** | 0 | **0** |
| Evidence | **150** | 0 | **0** |
| CU | **150** | 0 | **0** |
| Question Alignment | **142** | 8 | **0** |
| Founder Decision Value | **142** | 8 | **0** |
| 종합 | **142** | 8 | **0** |

generic-after-promotion: **0**  
failureCluster: **없음**

## 관찰 (Fix 아님)

`repeat_zero` 8행에서 spoken 축 라벨이 CU와 어긋난다고 채점됨 (payer_split / payer_job). FAIL 아님. verdict 오승격 없음. 같은 원칙(2/2 다음 기간 bind, 계획≠VALIDATED, 지불만 비해제)은 10유형에서 유지.

## Fix Gate

**HOLD.** FAIL 0. Founder Decision Value FAIL 0. #139 `missed_downgrade`는 이 holdout에서 재현되지 않았다.

## 미변경

Analyzer · Judgment · classifier · Presenter · SoT · Auth · #139 · Production `0b46522`
