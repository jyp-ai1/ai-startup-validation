# Accuracy Batch Holdout-22 — 10 more food and gym types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**PR:** #161 · **Evidence SHA:** `db1fa65` · Draft  
**Preview:** https://ai-startup-validation-88j2qdjxe-jyp-ai1s-projects.vercel.app  
**GitHub Vercel check:** pass (`Gan4M4MknXe2gRdZ7DkZ2sTn2TJJ`, Deployment has completed)  
**Preview probe:** `/api/health` HTTP 302 Vercel SSO. SHA triangle 미확인. Preview 검증 PASS 아님.  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-22.json`  
**CEO Founder Test:** 없음

#139–#160과 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

해물탕 · 아구찜 · 찜닭 · 닭볶음탕 · 합기도 · 유도 · 무에타이 · 킥복싱 · 배드민턴 · 테니스  
15장면 × 10 = **150**. 누적(#139–#161) = **3450**.

## 축 집계

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **150** | 0 | **0** |
| Evidence | **150** | 0 | **0** |
| CU | **150** | 0 | **0** |
| Question Alignment | **140** | 10 | **0** |
| Founder Decision Value | **140** | 10 | **0** |
| 종합 | **140** | 10 | **0** |

generic-after-promotion: **0**  
failureCluster: **없음**  
missed_downgrade: **0**  
PARTIAL: 10 × `repeat_zero` (referee spoken payer_split / CU payer_job)

## Fix Gate

**HOLD.** FAIL 0. Preview Ready ≠ Merge/Production.

## 미변경

Analyzer · Judgment · classifier · Presenter · SoT · Auth · #139 · Production `0b46522`
