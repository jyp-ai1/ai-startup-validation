# spoken_generic_after_promotion — Repeatability Batch

**CPO Gate:** 측정 완료 · Fix Gate 후보 제출 · 엔진 미수정  
**Production:** `5cd89dc` Freeze  
**#131:** `8c3b652` CLOSED / Freeze  
**CI:** `6338f2b` PASS  
**#127:** `3015c9a` Freeze · **#129:** `44fdb33` Freeze  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-spoken-generic-batch.json`

#131이 발견한 패턴이 단일 관찰인지, 여러 사업/CU에서 반복되는 구조인지 본다. Analyzer / Judgment / Question Engine은 고치지 않았다.

## 정의

```text
REPRO  = 승격 AND CU/DCE/priority/whyAsking=다음 고객·기간 AND spoken=`실제 행동 증거가 필요합니다`
ABSENT = 승격 후 next-period CU인데 spoken은 구체적
CONTROL = t0 / held / C2C / 관광 / 지불만
FAILURE = Judgment / CU / DCE / State 자체가 틀림 (별도 분리)
Pattern A obstruction = generic 질문이 루프를 막음 (held가 CU를 퇴직시키지 못함)
```

Decision Value 저해: Founder가 spoken question만 읽으면 다음에 무엇을 검증해야 하는지 알 수 없다. CU/DCE/whyAsking은 맞다.

## 결과

| 사업군 | metric | 승격 후 CU | spoken | 판정 |
|---|---|---|---|---|
| B2B 물류 | 누락 | 다음 고객/기간 | 실제 행동 증거가 필요합니다 | **REPRO** |
| D2C 의류 | 반품률 | 다음 고객/기간 | 실제 행동 증거가 필요합니다 | **REPRO** |
| B2B 고객지원 | 부하 | 다음 고객/기간 | 실제 행동 증거가 필요합니다 | **REPRO** |
| 중고 카탈로그 | 미스매치 | 다음 고객/기간 | 실제 행동 증거가 필요합니다 | **REPRO** |
| 병원 청구 | 불일치 | 다음 고객/기간 | 실제 행동 증거가 필요합니다 | **REPRO** |
| 동네 의원 | no-show | 다음 고객/기간 | 실제 행동 증거가 필요합니다 | **REPRO** |
| B2B 온보딩 | 이탈 | 다음 고객/기간 | 실제 행동 증거가 필요합니다 | **REPRO** |
| 식품 창고 | 누락 | 다음 고객/기간 | 실제 행동 증거가 필요합니다 | **REPRO** |

candidate **8/8 REPRO**. Judgment/CU/DCE/State Failure **0**. Pattern A obstruction **0**.

| control | kind | spoken | 판정 |
|---|---|---|---|
| 8개 사업 t0 | paid_conversion | 지표 전후 + 결제 | CONTROL |
| 8개 사업 held | repeat_loop | 두 번째 행동 | CONTROL |
| C2C 재판매 t0 | repeat_loop | 재판매 등록·거래 | CONTROL |
| 양조장 관광 t0 | segment_proof | 세그먼트 실사용 | CONTROL |
| 지불만 | paid_conversion | 유료 제안 | CONTROL |

## Pattern A와 구분

2/2 이후 spoken이 generic인 표면은 Pattern A와 같다. 그러나 held 답이 들어오면 CU는 `반복 가능`으로 이동하고 spoken은 구체적이다. 루프는 막히지 않는다.

이 배치는 **Decision Value**만 본다. Founder가 질문만 읽어서는 `다음 고객/기간`을 검증해야 한다는 것을 알 수 없다.

## Fix Gate 후보 조건

| 조건 | 결과 |
|---|---|
| 서로 다른 사업/CU에서 동일 패턴 반복 | **8/8** · 물류·의류·지원·카탈로그·청구·의원·온보딩·창고 |
| Founder Decision Value 저해 | **예** · spoken만 generic, 축 이탈 없음 |
| CU/DCE/priority는 정확, spoken만 지속 일반화 | **예** · whyAsking도 다음 기간을 유지 |

단일 사례가 아니다. 사업명 하드코딩 없음.

## 미변경

Analyzer · Presenter · Question Engine · Auth · SoT · `#127` · `#129` · `#131` · Production `5cd89dc`

CEO Founder Test 미요청. 시간 기준 보고 없음.
