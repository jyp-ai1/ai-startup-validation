# Accuracy Batch Holdout-15 — 10 more food and trade types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**PR:** #154 · **Evidence SHA:** `7a2a4d7` · Draft  
**Preview:** https://ai-startup-validation-git-cursor-si-ac-8a842d-jyp-ai1s-projects.vercel.app  
**GitHub Vercel check:** pass (`Dnj9xD3uWu4hHq6NNdJwRRq4xgBv`, Deployment has completed)  
**Preview probe:** `/api/health` HTTP 302 Vercel SSO. SHA triangle 미확인. Preview 검증 PASS 아님.  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-15.json`  
**CEO Founder Test:** 없음

#139–#153과 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

순대 · 샤브샤브 · 이자카야 · 마루 · 단열 · 가스 · 폐기물 · 오토바이렌탈 · 편의점 · 반찬  
15장면 × 10 = **150**. 누적(#139–#154) = **2400**.

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
