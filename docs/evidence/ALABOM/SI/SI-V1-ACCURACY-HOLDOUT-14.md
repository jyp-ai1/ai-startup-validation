# Accuracy Batch Holdout-14 — 10 more food and trade types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-14.json`  
**Preview:** Ready 이후 기록. Ready 전 PASS 아님.  
**CEO Founder Test:** 없음

#139–#152와 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

햄버거 · 우동 · 와인바 · 보쌈 · 배관 · 전기공사 · 간판 · CCTV · 용달 · 워터파크  
15장면 × 10 = **150**. 누적(#139–#153) = **2250**.

## 축 집계

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **150** | 0 | **0** |
| Evidence | **150** | 0 | **0** |
| CU | **150** | 0 | **0** |
| Question Alignment | **143** | 7 | **0** |
| Founder Decision Value | **143** | 7 | **0** |
| 종합 | **143** | 7 | **0** |

generic-after-promotion: **0**  
failureCluster: **없음**  
missed_downgrade: **0**  
PARTIAL: 7 × `repeat_zero` (referee spoken payer_split / CU payer_job)

## Fix Gate

**HOLD.** FAIL 0. Preview Ready ≠ Merge/Production.

## 미변경

Analyzer · Judgment · classifier · Presenter · SoT · Auth · #139 · Production `0b46522`
