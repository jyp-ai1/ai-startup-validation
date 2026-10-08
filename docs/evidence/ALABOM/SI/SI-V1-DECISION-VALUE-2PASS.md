# CPO 2-pass — Founder Decision Value Accuracy Batch

**대상:** #137 Accuracy Batch (`d763a7a` 증거 · baseline `e7e6dd3`)  
**Engine / Production:** `0b46522` MATCH  
**Preview:** https://ai-startup-validation-git-cursor-si-dv-394f6e-jyp-ai1s-projects.vercel.app (SSO 302)  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-decision-value-2pass.json`  
**Merge:** HOLD · **Fix Gate:** HOLD · **Production:** UNCHANGED

배치 채점기(`score-si-decision-value-repro.ts`)를 import하지 않고 11개 live chain을 다시 돌렸다.

## Pass 1 — Accuracy

Live `resolveSiJourneyIntegration`으로 Judgment → CU → DCE → Priority → whyAsking → spoken을 재계산한다.

| | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Accuracy | **11** | 0 | 0 |

8사업군: t0 스테이크 CU → 2/2 후 CU=`다음 고객/기간`, spoken/whyAsking이 같은 축. generic-after-promotion **0**.  
C2C t0: 재판매 CU가 spoken에 있다.  
결제자 분리·직무: DCE 후 CU=`반복 가능`, spoken이 두 번째 계약/행동이다.

## Pass 2 — Strategy

S.I.가 판단하고 AI PM이 현재 CU를 실행하는가. Founder가 질문만 보고 다음 검증을 아는가. 사업이 달라도 같은 원칙인가.

| | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Strategy | **11** | 0 | 0 |

2/2 후 재판매로 축이 새지 않는다. 사업명 분기는 analyzer/presenter/2-pass referee에 없다.

## 판정

**PASS.** #134 이후 Founder Decision Value는 11시나리오에서 개선된 채 유지된다.

Merge HOLD — 측정 PR을 main에 넣으면 Production SHA가 `0b46522`에서 바뀐다.  
Fix Gate HOLD — FAIL 클러스터 없음.  
CEO Founder Test 없음.

## 미변경

Analyzer · Judgment · classifier · SoT · Question Engine · Auth · Production `0b46522`
