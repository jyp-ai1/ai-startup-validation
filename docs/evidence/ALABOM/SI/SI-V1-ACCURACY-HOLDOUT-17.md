# Accuracy Batch Holdout-17 — 10 more food and trade types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-17.json`  
**Preview:** Ready 이후 기록. Ready 전 PASS 아님.  
**CEO Founder Test:** 없음

#139–#155와 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

과일가게 · 야채가게 · 쌀집 · 막창 · 갈비 · 푸드트럭 · 공연장 · 붙박이장 · 금고 · 현수막  
15장면 × 10 = **150**. 누적(#139–#156) = **2700**.

## 축 집계

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **150** | 0 | **0** |
| Evidence | **150** | 0 | **0** |
| CU | **150** | 0 | **0** |
| Question Alignment | **144** | 6 | **0** |
| Founder Decision Value | **144** | 6 | **0** |
| 종합 | **144** | 6 | **0** |

generic-after-promotion: **0**  
failureCluster: **없음**  
missed_downgrade: **0**  
PARTIAL: 6 × `repeat_zero` (referee spoken payer_split / CU payer_job)

## Fix Gate

**HOLD.** FAIL 0. Preview Ready ≠ Merge/Production.

## 미변경

Analyzer · Judgment · classifier · Presenter · SoT · Auth · #139 · Production `0b46522`
