# Accuracy Batch Holdout-2 — 10 more types × 15 scenes

**CPO Gate:** 측정 전용 · Fix Gate HOLD · Merge HOLD · Production `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` 미변경 · #140 Draft 미변경  
**PR:** #141 · **Evidence SHA:** `01b586a` · Draft  
**Preview:** https://ai-startup-validation-git-cursor-si-ac-ae6bbf-jyp-ai1s-projects.vercel.app  
**Vercel comment:** Ready (`Ds229scwPgigubCZCCdEDnzJ5d9k`, 2026-10-08T14:56:17Z)  
**GitHub Vercel check:** pending (`Aiw3zCGXWtLctCcam1tAoaZWxK4D`) — Preview PASS 아님  
**Preview probe:** `/` · `/api/build-info` · `/api/health` → HTTP 302 Vercel SSO. SHA triangle 미확인. Preview 검증 PASS 아님.  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-2.json`  
**CEO Founder Test:** 없음

#139·#140와 **겹치지 않는** 10유형에서 같은 판단 사슬이 살아남는지 잰다.

## 규모

보험 · 농업 · 법률 서비스 · 보육 · 호텔/숙박 · 중고차 · 에너지/태양광 · 웨딩 · 노인케어 · 뷰티 살롱  
15장면 × 10 = **150**. 누적(#139 150 + #140 150 + holdout-2 150) = **450**.

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
missed_downgrade: **0** (#139 3건은 이 holdout에서도 재현되지 않음)

## 관찰 (Fix 아님)

`repeat_zero` 7행에서 spoken 축 라벨이 CU와 어긋난다고 채점됨 (payer_split / payer_job). FAIL 아님. verdict 오승격 없음. 같은 원칙(2/2 다음 기간 bind, 계획≠VALIDATED, 지불만 비해제)은 10유형에서 유지.

## Fix Gate

**HOLD.** FAIL 0. Founder Decision Value FAIL 0. 구조적 실패가 서로 다른 사업·검증축에서 반복되며 Decision Value를 훼손한 사례 없음.

## 미변경

Analyzer · Judgment · classifier · Presenter · SoT · Auth · #139 · Production `0b46522`
