# Accuracy Batch Holdout-20 — 10 more food and venue types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경  
**PR:** #159 · **Evidence SHA:** `a2b2f5f` · Draft  
**Preview:** https://ai-startup-validation-mn7otfkhn-jyp-ai1s-projects.vercel.app  
**GitHub Vercel check:** pass (`26FdD6aNYUCsWQ5RssdCgqWzY2kw`, Deployment has completed)  
**Preview probe:** `/api/health` HTTP 302 Vercel SSO. SHA triangle 미확인. Preview 검증 PASS 아님.  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-20.json`  
**CEO Founder Test:** 없음

#139–#158과 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

순두부 · 청국장 · 도가니 · 수육 · 수목원 · 미술관 · 박물관 · 왁싱 · 사주카페 · 스크린골프  
15장면 × 10 = **150**. 누적(#139–#159) = **3150**.

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
