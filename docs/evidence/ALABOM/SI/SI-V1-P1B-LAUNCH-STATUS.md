# P1-B Launch Status Interpretation

**CPO Gate:** OPEN · Draft · 2-pass 전 Merge/Production 금지  
**Production baseline:** `5226fa1` (P1-C CLOSED · 재검증 없음)  
**P1-A:** CLOSED · **P1-C:** CLOSED  
**PR #119 / #120 / #124:** Draft 유지  
**Branch:** `cursor/si-p1b-launch-status-e648`  
**PR:** https://github.com/jyp-ai1/ai-startup-validation/pull/127 (Draft)  
**Fix SHA:** `c0396162b068b0e78bcb22ae3a1bb3f46a6b4cbe`  
**Preview:** https://ai-startup-validation-git-cursor-si-p1-fd35fa-jyp-ai1s-projects.vercel.app

`MVP 런칭 예정` / `출시 준비`를 `이미 출시되어 있다`로 읽지 않는다.  
완료 동사(`출시했`, `실제 사용 중`)만 launch FACT다.

## 변경 파일

| 파일 | 역할 |
|---|---|
| `launch-status.ts` | 계획 vs 완료 출시 의미 분리 |
| `analyze-strategic-intelligence.ts` | launch 스캔만 helper 사용. `decideVerdict` / `dceStakeOpen` / `pickCriticalUnknown` / `decideStage` 유지 |
| `classify-founder-evidence.ts` | 계획 출시 답 = CLAIM, VALIDATED 아님 |
| `si-p1b-launch-status.test.ts` | 6케이스 + surface leak |

**미변경:** Presenter · Question Engine · Auth · SoT · P1-A · P1-C · Gap Loop · 사업명 분기

Analyzer는 helper import만 추가했다. Judgment architecture rewrite 없음.  
`MVP 런칭 → 이미 출시` 치환 없음.

## 규칙

| 표면 | 의미 | 결과 |
|---|---|---|
| MVP 런칭 예정 / 출시 계획 / 개발 예정 / 출시 준비 중 / 제안 예정 | 계획 | CLAIM · launch FACT 아님 · Strength에 `이미 출시` 없음 |
| 출시했다 / 실제 출시 / 현재 사용자 / 실제 사용 중 / 유료 고객이 실제 | 완료 | launch FACT · Strength `이미 출시되어 있다` |
| 계획만 | — | VALIDATED 승격 없음 |

출시 FACT가 있으면 `decideStage`가 S3로 간다. 계획 출시는 `unverified` CLAIM이라 S3를 만들지 않고, CU/Priority는 유료 전환(판단을 바꾸는 다음 증거)을 묻는다.

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

| Gate | 결과 |
|---|---|
| P1-B targeted | 5 passed |
| S.I. suite | 185 passed (36 files, includes P1-B 5) |
| P1-A 4축 | PASS |
| P1-C · quantity-unit | PASS |
| #104 Partial DCE | PASS |
| #107 / Negative | PASS |
| P0-1 | PASS (14) |
| P0-2 | PASS (10) |

Dump JSON은 테스트가 다시 쓰므로 restore. 커밋하지 않음.

## Preview / SHA

| | |
|---|---|
| Fix SHA | `c039616` |
| Preview | https://ai-startup-validation-git-cursor-si-p1-fd35fa-jyp-ai1s-projects.vercel.app |
| Vercel | Ready · Preview Comments PASS · `2026-10-08T04:17:55Z` |
| Production | UNCHANGED `5226fa1` (P1-C CLOSED) |

Vercel Authentication SSO. Preview `/api/*`는 302. Merge / Production은 CPO 2-pass 후.

## STOP

계획→이미 출시 · 계획 답 VALIDATED · 사업명 분기 · Analyzer rewrite · P1-C 재작업 · Question Engine 교체 · SoT/Auth 변경 · CEO Founder Test: **없음**.
