# S.I. Pattern A Obstruction — MEASUREMENT COMPLETE

**Branch:** `cursor/si-pattern-a-obstruction-e648`  
**Prior:** Question Alignment Fix PASS CLOSED (`6926d6f`) · Pattern B 4/4 PASS · Pattern A 6/6 PARTIAL  
**Production:** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2` 불변  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-pattern-a-obstruction.json`  
**금지:** Question Generator · `detectSiValidationKind` · Analyzer · Presenter · persist SoT · 사업명 분기 · Fix PR · Production promotion

Pattern A generic next-CU ask가 **실제 Founder 판단/검증 행동을 방해하는지**만 측정한다. Spoken 일반화는 이미 PARTIAL로 닫혀 있다.

## 규모

6. Holdout Pattern A 그대로. unnamed 누락·부하·미스매치·불일치 + ClinicFlow/FitBridge alt 2/2.

각 케이스: 2/2 승격 후 generic ask에서

| 답 | Founder 행동 |
|---|---|
| on-CU | CU가 묻는 다음 고객/기간 동일 성과 |
| generic-literal | spoken 질문 그대로 추가 결제 |
| wrong-axis | 재판매 수량 (repeat_validation) |
| plan-only | 질문 안내대로 계획만 |

## Obstruction (CPO 기준)

| | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Pattern A obstruction | 0 | **6** | **0** |

PASS: spoken 질문이 CU 객체를 보존하고 루프가 막히지 않음.  
PARTIAL: 질문은 일반화돼 있으나 CU/whyAsking이 다음 행동을 복구하고 상태는 정직.  
FAIL: spoken 답을 따르면 next CU가 닫히거나, Founder가 다음 행동을 잃음.

## 분기

| 분기 | 결과 | 의미 |
|---|---|---|
| generic-literal 추가 결제 | 6 PARTIAL · S3 유지 · CU 유지 | 한 턴 낭비. **오판정/오승격 없음** |
| on-CU 다음 기간 성과 | 6 PARTIAL · S3 유지 · CU 유지 | Analyzer에 next-period signal 없음 (동결). 상태 오염 없음 |
| wrong-axis 재판매 | 6 PARTIAL · S3→S4 | engine `repeat_validation` 경로. 질문이 재판매로 이탈하진 않음 |
| plan-only | 6 PARTIAL · CU 유지 | 지연. 닫히지 않음 |

## Surface recoverability

6/6. 질문은 generic이지만 `whyAsking` + CU + Priority가 `다음 고객 또는 다음 기간`을 유지한다. Workspace 사용자는 다음 행동을 잃지 않는다.

```text
questionText  generic: 실제 행동 증거가 필요합니다
whyAsking     다음 고객 또는 다음 기간에서 같은 성과가 유지되는지
CU / Priority 다음 고객/기간
```

## Repeated

없음. obstruction FAIL 0.

## Regression

#104 · #107 · Negative hops · leftover 0 · Alignment Fix Pattern B 4/4 · P0-1/P0-2 unit PASS. Analyzer / Presenter / `detectSiValidationKind` 0-diff.

## Fix Gate

**NOT OPEN.** Pattern A는 검증 축 이탈이 아니라 일반화 PARTIAL이다. generic-literal이 next CU를 닫지 않고, surface가 다음 기간 행동을 복구한다.

## Production

UNCHANGED `dea7cb1`. Promotion은 CPO 판단.
