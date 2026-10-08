# spoken_generic_after_promotion — Presentation Fix

**CPO Gate:** OPEN · 2-pass 전 Merge/Production 금지  
**Production:** `5cd89dc` Freeze  
**#131:** `8c3b652` CLOSED · **#133:** `c4c36a8` 8/8 REPRO  
**#127:** `3015c9a` Freeze · **#129:** `44fdb33` Freeze  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-spoken-generic-fix.json`

8/8 반복이 확인된 뒤, Founder-visible spoken question만 고친다. Analyzer / Judgment / SoT는 그대로다.

## 변경

| 파일 | 역할 |
|---|---|
| `present-si-ai-pm-question.ts` | next-period CU → held-outcome 질문. 축을 모를 때만 generic Pattern A |
| `si-spoken-generic-fix.test.ts` | 8 사업군 Founder-visible 대화 증거 |
| `si-question-alignment-fix.test.ts` | Pattern A next-CU lock을 구체 질문으로 갱신 |

**미변경:** `analyze-strategic-intelligence.ts` · `decideVerdict` · CU/DCE/Priority · classifier · Auth · SoT · Gap Loop · 사업명 분기 · `detectSiValidationKind`

## After 2/2

```text
CU / DCE / Priority / whyAsking = 다음 고객·기간
kind = generic   ← kind 검출 불변
spoken = 다음 고객 또는 다음 기간에서 같은 성과가 유지된 경우가 있습니까?
```

## 8/8 Acceptance

| 사업군 | metric | CU 이동 | spoken | generic-after-promotion |
|---|---|---|---|---|
| 물류 · 의류 · 지원 · 카탈로그 · 청구 · 의원 · 온보딩 · 창고 | 누락·반품률·부하·미스매치·불일치·no-show·이탈·누락 | PASS | 다음 고객/기간 | **0** |

whyAsking과 spoken의 검증 대상이 같다. t0 P1-A 결제 축과 held 반복 축은 유지된다.

## 회귀

P1-A 4축 · #104 · #107 · P0-1/P0-2 · SI Accuracy suite PASS.

CEO Founder Test 미요청. 시간 기준 보고 없음.
