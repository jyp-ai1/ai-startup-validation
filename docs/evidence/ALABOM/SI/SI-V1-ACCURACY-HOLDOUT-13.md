# Accuracy Batch Holdout-13 — 10 more food and trade types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**PR:** #152 · **Evidence SHA:** `fbc8e1a` · Draft  
**Preview:** https://ai-startup-validation-git-cursor-si-ac-4ea9c2-jyp-ai1s-projects.vercel.app  
**GitHub Vercel check:** pass (`7WQnnHchwewzgtWNvHJ3kweqEv6d`, Deployment has completed)  
**Preview probe:** `/api/health` HTTP 302 Vercel SSO. SHA triangle 미확인. Preview 검증 PASS 아님.  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-13.json`  
**CEO Founder Test:** 없음

#139–#151과 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

김밥 · 곱창 · 라멘 · 필라테스 · 오락실 · 도배 · 샷시 · 퀵서비스 · 글램핑 · 낚시터  
15장면 × 10 = **150**. 누적(#139–#152) = **2100**.

## 축 집계

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **150** | 0 | **0** |
| Evidence | **150** | 0 | **0** |
| CU | **150** | 0 | **0** |
| Question Alignment | **141** | 9 | **0** |
| Founder Decision Value | **141** | 9 | **0** |
| 종합 | **141** | 9 | **0** |

generic-after-promotion: **0**  
failureCluster: **없음**  
missed_downgrade: **0**  
PARTIAL: 9 × `repeat_zero` (referee spoken payer_split / CU payer_job)

## Fix Gate

**HOLD.** FAIL 0. Preview Ready ≠ Merge/Production.

## 미변경

Analyzer · Judgment · classifier · Presenter · SoT · Auth · #139 · Production `0b46522`
