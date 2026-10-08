# P1-B Launch Status Interpretation

**CPO Gate:** OPEN · Draft · Merge/Production 금지  
**Production baseline:** `5226fa1` (P1-C CLOSED)  
**P1-A:** CLOSED · **P1-C:** CLOSED  
**PR #119 / #120 / #124:** Draft 유지

`MVP 런칭 예정` / `출시 준비`를 `이미 출시되어 있다`로 읽지 않는다.  
완료 동사(`출시했`, `실제 사용 중`)만 launch FACT다.

## 변경 파일

| 파일 | 역할 |
|---|---|
| `launch-status.ts` | 계획 vs 완료 출시 의미 분리 |
| `analyze-strategic-intelligence.ts` | launch 스캔만 helper 사용. `decideVerdict` / `dceStakeOpen` 유지 |
| `classify-founder-evidence.ts` | 계획 출시 답 = CLAIM, VALIDATED 아님 |
| `si-p1b-launch-status.test.ts` | 6케이스 + surface leak |

**미변경:** Presenter · Question Engine · Auth · SoT · P1-A · P1-C · Gap Loop · 사업명 분기

## 규칙

| 표면 | 의미 | 결과 |
|---|---|---|
| MVP 런칭 예정 / 출시 계획 / 개발 예정 / 출시 준비 중 / 제안 예정 | 계획 | CLAIM · launch FACT 아님 · Strength에 `이미 출시` 없음 |
| 출시했다 / 실제 출시 / 현재 사용자 / 실제 사용 중 / 유료 고객이 실제 | 완료 | launch FACT · Strength `이미 출시되어 있다` |
| 계획만 | — | VALIDATED 승격 없음 |

`MVP 런칭 → 이미 출시` 치환 없음.

## Acceptance

| 케이스 | 기대 | 결과 |
|---|---|---|
| 양조장 `MVP 런칭 예정` | 출시 완료 아님 | PASS |
| 양조장 `실제 출시 + 현재 사용자` | 출시 FACT | PASS |
| B2B `고객사에 제안 예정` | CLAIM · VALIDATED 아님 | PASS |
| B2B `고객사에서 실제 사용 중` | 출시 FACT | PASS |
| SaaS `출시 준비 중` | 출시 완료 아님 | PASS |
| SaaS `유료 고객이 실제 사용 중` | 출시 FACT · VALIDATED 아님 | PASS |
| Founder surface | targetGap / score 미노출 | PASS |

## Regression

SI suite **198** (P1-B 5 포함) · P1-A 4축 · P1-C · #104 · #107 · P0-1 · P0-2 PASS

## Production

UNCHANGED until CPO 2-pass. CEO Founder Test 미요청.
