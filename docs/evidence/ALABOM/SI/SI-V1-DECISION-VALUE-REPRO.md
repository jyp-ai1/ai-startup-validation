# Founder Decision Value — reproducibility / strategic impact

**CPO Gate:** 측정 전용 · Fix Gate 미개방 · Merge/Production 금지  
**Production:** `0b46522` 불변  
**#134:** Production Acceptance CLOSED · **`spoken_generic_after_promotion`:** FIX CLOSED  
**#136:** 3사업군 5층 측정 CLOSED (`a46ffe3`, 미머지)  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-decision-value-repro.json`

#136은 물류·의류·의원 3곳에서 2/2 Decision Value가 PASS로 돌아왔다는 **한 번**의 관찰이다. 같은 5층을 8사업군 + 지불만/계획/악화/held 이후 팔로업 + C2C·결제자 분리·직무 CU에서 다시 잰다. 엔진은 고치지 않았다.

## 질문

1. Closed 소견(`spoken_generic_after_promotion` = 0, 2/2 spoken = 다음 기간)이 더 많은 사업에서 반복되는가.
2. held 이후 남은 관찰이 반복되는가.
3. 그 관찰이 Founder의 판단(verdict/stage/CU 퇴직)을 바꾸는가.

## 5층

Accuracy · Judgment · Validation · Decision Value · Strategy

## 결과

| 축 | 규모 | 결과 |
|---|---|---|
| 2/2 5층 | 8/8 | **PASS** · spoken = 다음 고객/기간 · generic 0 |
| held 5층 | 8/8 | **PASS** |
| 지불만 승격 | 0/8 | 승격 없음 |
| 계획만 CU 닫힘 | 0/8 | 닫히지 않음 |
| extra CU (C2C t0/검증, 결제자 분리, 직무) | 6/6 | 5층 PASS |
| 질문 경로 vs 원래 stake 경로 | 0/8 | verdict/stage/CU **불변** |

## 반복된 관찰 (Fix 아님)

| 관찰 | 횟수 | 전략 영향 |
|---|---|---|
| `stake_dropped_after_held` — held 이후 spoken이 원래 지표(누락·반품 등)를 잃는다 | **8/8** | OBSERVED |
| `answered_spoken_stale_cu` — spoken 반복 질문에 수량 답(VALIDATED)을 해도 CU가 남는다 | **8/8** | OBSERVED · 한 턴 낭비, 오판정 없음 |
| `spoken_followup_diverges` | **0/8** | 없음 |
| `wrong_axis_promotes` — Founder가 재판매를 **주입**하면 S4 | **8/8** | 질문이 재판매를 묻지 않음. 기존 engine `repeat_validation` 경로 |

`impactCounts`: OBSERVED 8 · IMPACT 0 · NONE 0

## 판정

Closed #134 소견은 8사업군에서 반복된다. 남은 관찰도 8/8 반복되지만, spoken을 따라도 원래 stake를 따라도 **판단이 갈라지지 않는다**. 오승격·오하향 없음.

Fix Gate **미개방**. 단일 관찰을 Fix로 승격하지 않는다. 다음 판단은 이 반복 관찰이 실제 Founder 결정을 막는다고 CPO가 확정할 때다.

## 미변경

Analyzer · Judgment · Presenter · SoT · Question Engine · Auth · `#127` · `#129` · `#131` · `#135` · `#136` · Production `0b46522`

CEO Founder Test 미요청.
