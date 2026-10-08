# Accuracy Batch Holdout-23 — 10 more food and gym types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**PR:** #162 · **Evidence SHA:** `c3bd13e` · Draft  
**Preview:** https://ai-startup-validation-dur6tfsie-jyp-ai1s-projects.vercel.app  
**GitHub Vercel check:** pass (`7HnLGXYvSvqfLdEH3K4UW1ps1BaD`, Deployment has completed)  
**Preview probe:** `/api/health` HTTP 302 Vercel SSO. SHA triangle 미확인. Preview 검증 PASS 아님.  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-23.json`  
**CEO Founder Test:** 없음

#139–#161과 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

쭈꾸미 · 낙지 · 문어 · 코다리 · 펜싱 · 레슬링 · 배구 · 농구 · 풋살 · 아이스링크  
15장면 × 10 = **150**. 누적(#139–#162) = **3600**.

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
