# Accuracy Batch Holdout-19 — 10 more food and venue types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**PR:** #158 · **Evidence SHA:** `f9e7afd` · Draft  
**Preview:** https://ai-startup-validation-qfds6a30e-jyp-ai1s-projects.vercel.app  
**GitHub Vercel check:** pass (`7JvXZYnekdSEo6VrR6rypQHjbb7g`, Deployment has completed)  
**Preview probe:** `/api/health` HTTP 302 Vercel SSO. SHA triangle 미확인. Preview 검증 PASS 아님.  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-19.json`  
**CEO Founder Test:** 없음

#139–#157과 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

콩나물국밥 · 비빔밥 · 오리훈제 · 대게 · 식물원 · 라이브하우스 · 복사 · 피어싱 · 동물원 · 아쿠아리움  
15장면 × 10 = **150**. 누적(#139–#158) = **3000**.

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
