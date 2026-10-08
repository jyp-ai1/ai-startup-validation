# Accuracy Batch — Conversation Quality (Next-Period Listen)

**CPO Gate:** OPEN · Draft · 2-pass 전 Merge/Production 금지  
**Production baseline:** `5226fa1` (P1-C CLOSED) · Git `a7a4a28`  
**P1-A:** CLOSED · **P1-C:** CLOSED  
**PR #127:** Freeze `3015c9a` · 이 Batch에 포함하지 않음  
**Branch:** `cursor/si-conversation-quality-e648`  
**PR:** https://github.com/jyp-ai1/ai-startup-validation/pull/128 (Draft)  
**Fix SHA:** `ddbfb38f9db1b7aec6e468d38f20a78227942214`  
**Preview:** https://ai-startup-validation-git-cursor-si-co-befde9-jyp-ai1s-projects.vercel.app

Founder가 다음 기간 CU에 답해도 루프가 같은 미검증을 반복하면, 질문은 CU를 검증하지 못한 것과 같다.

## 변경 목적

2/2 이후 CU는 `다음 고객/기간`이다. 그 성과가 **유지됐다**는 답이 들어오면 이전 CU를 퇴직하고, 다음 미검증(반복 가능)으로 이동한다. 측정 예정만 있는 답은 퇴직시키지 않는다.

## 변경 범위

| 파일 | 역할 |
|---|---|
| `next-period-outcome.ts` | 계획 vs 유지된 다음 기간 성과 |
| `analyze-strategic-intelligence.ts` | 스캔 + `pickCriticalUnknown`에서 held일 때만 next-period triad skip |
| `classify-founder-evidence.ts` | 다음 기간 계획 = CLAIM |
| `si-conversation-quality.test.ts` | 대화 루프 Accuracy Batch |

**미변경:** `decideVerdict` / `decideStage` / `dceStakeOpen` · Presenter · Question Engine · Auth · SoT · P1-A · P1-C · P1-B · Gap Loop · 사업명 분기

## Before / After

대표 대화: 이름 없는 검수 누락 사업.

| Turn | 입력 | Before | After |
|---|---|---|---|
| t0 | 문서만 | 판단/CU/DCE 읽힘 | 동일 |
| t1 | 지불만 | deferred · S1 · #104 | 동일 |
| t2 | 지불 + 지표 전후 | S3 · CU=다음 기간 | 동일 |
| t3 | `다음 기간에도 누락 6% 유지 + 다음 고객 2곳` | CU 잔류 · 같은 미검증 반복 | CU 퇴직 → 반복 가능 · S3 유지 |
| t3' | `다음 기간 성과를 측정할 예정` | — | CLAIM · VALIDATED 아님 · S3 아님 |

## Expected / Actual

| 축 | Expected | Actual |
|---|---|---|
| 초기 판단 / 근거 / 리스크 | 읽힘 · leak 없음 | PASS |
| CU / DCE / 다음 행동 | 판단을 막는 이유와 이동 조건 | PASS |
| 질문 ↔ CU | 2/2 후 다음 기간 CU를 질문/whyAsking이 붙잡음 | PASS |
| 지불만 / 계획 답 | 승격 없음 · CLAIM | PASS |
| 다음 기간 유지 답 | 이전 CU 퇴직 · 판단 유지 | PASS |
| 사업명 하드코딩 | 없음 | PASS |

## 실패 사례

| 입력 | 결과 |
|---|---|
| 첫 2/2 줄 (`결제 + 14%→6%`) | next-period held 아님 |
| `다음 기간에 누락이 늘었다` | held 아님 |
| `측정할 예정` | CLAIM · 루프 이동 없음 |

## 회귀

| Gate | 결과 |
|---|---|
| Conversation targeted | 4 passed |
| next-period helper | 3 passed |
| S.I. (dump 제외) | 182 passed |
| P1-A 4축 | PASS |
| P1-C · quantity-unit | PASS |
| #104 / #107 / stale CU | PASS |
| Pattern A obstruction | PASS (6) |
| P0-1 | PASS (14) |
| P0-2 | PASS (10) |

## Preview / SHA

| | |
|---|---|
| Fix SHA | `ddbfb38` |
| Preview | https://ai-startup-validation-git-cursor-si-co-befde9-jyp-ai1s-projects.vercel.app |
| Vercel | Ready · Preview Comments PASS · Deployment SSO |
| Production | UNCHANGED `5226fa1` |
| `#127` | Freeze `3015c9a` |

## Production 영향

없음. Draft only. P1-B `#127` SHA 불변.

## STOP

Analyzer rewrite · Question Engine 교체 · `#127` commit · Auth/SoT · 사업명 분기 · CEO Founder Test: **없음**.
