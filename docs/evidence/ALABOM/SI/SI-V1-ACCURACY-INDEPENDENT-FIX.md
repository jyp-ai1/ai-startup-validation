# S.I. Independent Fix Gate — five #194 failure types

**Branch:** `cursor/si-accuracy-independent-fix-e648`  
**Fix Gate:** OPEN — this Draft only  
**기준 Dump Lock:** `a79c81c` (#194, unchanged)  
**Production SHA:** `0b46522` UNCHANGED  
**Locks held:** #139 / #140 / #192 / #193 / #194  
**Merge / Production deploy:** forbidden until CPO acceptance  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-independent-fix.json`

#194 측정 브랜치·dump·PR는 변경하지 않았다. 이 문서는 별도 Fix Draft의 구현 증거다.

## 데이터 흐름

```text
document + [Founder evidence]
  → extractProblemMetric (si-problem-metric.ts)
  → quantified_problem / stake_improved / stake worsen retract
  → dceStakeOpen = FACT metric && !stake_improved
  → decideStage / decideVerdict
  → pickCriticalUnknown (stakeNoun = extracted token)
  → presentSiAiPmQuestion.stakeFromAsk(/수치화한 (.+?) 수치/)
```

오축 재판매 완료는 `bindRepeatValidationToOpenAxis`에서만 처리한다. 원문에 `resale_thesis`가 없고 문서 지표 축이 열려 있으면 founder `repeat_validation`과 founder-only `resale_thesis`를 철회한다.

## 변경 파일 (최소)

| 파일 | 역할 |
|---|---|
| `si-problem-metric.ts` | 문서 수량에서 현재 문제 지표를 추출. 닫힌 `STAKE_NOUN` 전용 아님. 사업명 분기 없음 |
| `analyze-strategic-intelligence.ts` | 추출기 결합, FACT-only `dceStakeOpen`, 오축 반복 철회, `no_revenue`↔revenue 정합 |
| `present-si-ai-pm-question.ts` | CU가 이름 붙인 지표를 질문으로 직조 |
| `__tests__/si-problem-metric.test.ts` | 추출기 단위 |
| `__tests__/si-accuracy-independent-fix.test.ts` | 8개 사업 × A1–A5 |

SoT / persist / 기존 Lock dump는 변경하지 않았다.

## 추출 규칙 (allowlist 확장 아님)

수량(`%`/`건`)이 **현재 피해**로 읽힐 때만 지표다.

- 채택: `X가/이 N%입니다`, `N%를 겪고`, 알려진 피해 명사, 전후 이동
- 제외: 결제 인원, CAGR/시장 전망, `줄이면 유지율 80%` 같은 목표 KPI, 구매자 헤드카운트

## 5개 실패 유형 Before / After

Before = #194 dump `a79c81c` on Production `0b46522`. After = this branch live analyzer. 8 types: 냉동물류 IoT · 치과기공 · 굴착기 · 선박급유 · 3D수탁 · 급식잔반 (unseen) + 임상 노쇼 · 송금 불일치 (known).

| # | 유형 | Before (`a79c81c`) | After (this Draft) |
|---|---|---|---|
| 1 | 부분 매출 과대 승격 | unseen 6: payment-only → `conditionally_viable` / **S3** | 8/8: `judgment_deferred`, **not S3/S4**, CU still names the metric |
| 2 | 악화 증거 누락 | unseen 6: worsen stays `conditionally_viable` / S3 | 8/8: not viable S3; typically `judgment_deferred` / S0 after retract |
| 3 | 반복 검증 과대 승격 | 8/8 wrong-axis → `viable` / **S4** | 8/8: not S4 viable; stays S3 `conditionally_viable` on next-period CU |
| 4 | Critical Unknown 누락 | unseen 6 t0 CU omits the metric (`stake_blind_overfit`) | 8/8 t0 CU contains the document token (온도 초과 / 보철 재작업 / 공회 / …) |
| 5 | 판단 문구 모순 | S4 viable headline “가능성이 높음” + risk “상업 실행 증거가 없다” | no `가능성이 높음` + `상업 실행 증거가 없다` pair; `no_revenue` retracts when live revenue exists |

## 회귀

`apps/web` SI `__tests__`: **40 files / 201 tests PASS** including

- #104 / #107 (`si-negative-judgment`, `si-evidence-reconciliation`, `si-stale-cu`)
- P1-A RIDM after payment → `repeat_loop` (not held on a false market %)
- P1-C 동네장터 1건 payment → `viable` / S3
- first-pass / calibration / analyzer unit
- accuracy-closure / question-alignment / decision-quality

기존 Lock dump JSON은 이 PR에 포함하지 않는다.

## SoT / Lock

| 항목 | 상태 |
|---|---|
| Production `0b46522` | 불변 |
| #194 dump `a79c81c` | 불변 · 이 브랜치에서 미수정 |
| #139 / #140 / #192 / #193 | 불변 |
| persist SoT / Journey contract | 변경 없음 |
| Analyzer / Presenter | 위 최소 파일만 |

## 잔여 위험

- 문서에 현재 피해 문형(`가/이 N%`)이 없고 목표 KPI만 있으면 지표를 열지 않는다. 의도된 경계다.
- 지표 없는 사업의 공식 `repeat_loop` 답(`재판매를 등록했고 12건이 거래됐다`)은 기존 playbook대로 S4가 될 수 있다. 지표 축이 있는 사업에서만 오축 S4를 막는다.
- Preview 1회: GitHub Vercel `Deployment has completed` on `09c0734`. URL `https://ai-startup-validation-git-cursor-si-ac-7abe34-jyp-ai1s-projects.vercel.app` → HTTP 302 `vercel.com/sso-api`, body `Protected by Vercel Authentication`. **SSO ≠ Preview PASS.** 재시도 없음.
- Vercel 대시보드 플랜·사용량·리셋 시각은 미확인. recovery 주장 없음. `api-deployments-free-per-day`는 이번 1회에서 관측되지 않았으나 한도 해제로 해석하지 않는다.

## CPO

CTO는 Merge하지 않는다. 수용 판정 전 Production 변경 금지.
