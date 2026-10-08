# spoken_generic_after_promotion — Reproducibility

**CPO Gate:** OPEN · 측정 전용 · Fix Gate 미개방  
**Production:** `5cd89dc` Freeze  
**#131:** `8c3b652` Measurement CLOSED  
**#127:** `3015c9a` Freeze · **#129:** `44fdb33` Freeze  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-spoken-generic-repro.json`

#131이 발견한 `spoken_generic_after_promotion`이 **한 문서의 문구 문제인지, 2/2 승격 후 일반 상태인지**만 본다. 엔진은 고치지 않았다.

## 정의

```text
REPRO  = 승격(S3/viable) AND CU=다음 고객/기간 AND spoken=`실제 행동 증거가 필요합니다`
ABSENT = 승격 또는 next-period CU인데 spoken은 구체적
CONTROL = t0 / held / C2C처럼 이 패턴의 대상이 아님
```

## 결과

| 행 | metric | 역할 | kind | spoken | 판정 |
|---|---|---|---|---|---|
| 누락 t0 | 누락 | control | paid_conversion | 누락 전후 + 결제 | CONTROL |
| 누락 2/2 | 누락 | candidate | generic | 실제 행동 증거가 필요합니다 | **REPRO** |
| 누락 held | 누락 | control | repeat_loop | 두 번째 행동 | ABSENT |
| 반품률 2/2 | 반품률 | candidate | generic | 실제 행동 증거가 필요합니다 | **REPRO** |
| 부하 2/2 | 부하 | candidate | generic | 실제 행동 증거가 필요합니다 | **REPRO** |
| 미스매치 2/2 | 미스매치 | candidate | generic | 실제 행동 증거가 필요합니다 | **REPRO** |
| C2C t0 | 재판매 | control | repeat_loop | 재판매 등록·거래 | CONTROL |

candidate **4/4 REPRO**. control **0 REPRO**.

whyAsking은 4건 모두 `다음 고객 또는 다음 기간에서 같은 성과가 유지되는지`를 유지한다. 축 이탈 없음.

## 의미

특정 사업/metric 분기가 아니다. 2/2 후 next-period CU가 열리면 ask kind가 `generic`이 된다. t0와 held에서는 같은 패턴이 없다.

Fix Gate는 이 PR에서 열지 않는다. 재현성은 확인됐다. CPO가 Fix Gate를 열지 판단한다.

## 미변경

Analyzer · Presenter · Question Engine · Auth · SoT · `#127` · `#128` · `#129` · `#131`

CEO Founder Test 미요청.
