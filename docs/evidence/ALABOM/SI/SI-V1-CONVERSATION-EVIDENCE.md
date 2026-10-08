# Conversation Quality Evidence Batch

**CPO Gate:** OPEN · 독립 증거 · `#128` 코드 미변경  
**측정 대상:** `#128` Freeze `71df6f90057e2b8123bfb79e331c9b46d978491b`  
**#127:** Freeze `3015c9a`  
**Production:** UNCHANGED `5226fa1`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-conversation-evidence.json`  
**Referee:** `score-si-conversation-evidence.ts` — `#128` self-scorer / `next-period-outcome.ts`를 import하지 않음

`#128` 구현 테스트와 분리해서, Founder-visible 실제 대화 표면만 기록한다.

## 5축

| # | 시나리오 | 기대 | 실제 | 판정 |
|---|---|---|---|---|
| 1 | 2/2 직후 | CU=다음 고객/기간 · 질문이 그 CU를 붙잡음 | viable S3 · CU=다음 기간 · whyAsking이 다음 기간을 붙잡음 | PASS |
| 2 | 다음 기간 유지 | 기존 CU 퇴직 · 새 질문 | CU=반복 가능 · 질문 변경 · FACT · S3 유지 | PASS |
| 3 | 다음 기간 악화 | 성공 퇴직 금지 | deferred S1 · CONFLICT · down · CU=누락 전후 | PASS |
| 4 | 다음 기간 측정 예정 | CLAIM · 승격 없음 | CLAIM · unchanged · CU 유지 | PASS |
| 5 | 다른 metric (부하) | 동일 의미 규칙 | CU=반복 가능 · S3 유지 | PASS |

## 실제 대화

### 1. 2/2 직후 — 누락 14%→6% + 결제

**입력:** `결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.`

| | 예상 | 실제 |
|---|---|---|
| 판단 | 승격 | `사업화 가능성이 높음` · viable / S3 |
| CU | 다음 고객/기간 | `이번 성과가 다음 고객이나 다음 기간에도 같은 방향으로 이어지는가.` |
| DCE | 유지되면 유지, 1회성이면 내림 | 동일 의미 |
| 질문 | 다음 기간 CU를 검증 | spoken=`실제 행동 증거가 필요합니다`(Pattern A generic) · whyAsking=`다음 고객 또는 다음 기간에서 같은 성과가 유지되는지` |
| class | VALIDATED | VALIDATED · delta=up |

질문 원문은 generic이다. CU 정렬은 whyAsking에 있다. 이 점은 `#128` 이전 Pattern A와 같다.

### 2. 다음 기간 유지 — 기존 CU 퇴직

**입력:** `다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.`

| | 예상 | 실제 |
|---|---|---|
| 판단 | S3 유지 | viable / S3 |
| CU | 기존 next-period 퇴직 | `현재 강점이 반복 가능한 사업으로 이어지는가.` |
| 질문 | 같은 질문 반복 금지 | `이미 구매하거나 결제한 고객 중에서, 두 번째 행동이나 반복 사용이 일어난 경우가 있습니까?` |
| class | VALIDATED 아님 | FACT · CU changed=true |

**질문 전이**

```text
2/2  ask = 지금 판단을 바꾸려면 실제 행동 증거가 필요합니다…
YES  ask = 이미 구매하거나 결제한 고객 중에서, 두 번째 행동이나 반복 사용이…
```

같은 전후 질문 반복 없음.

### 3. 다음 기간 악화 — 잘못된 퇴직 없음

**입력:** `다음 기간에 누락이 6%에서 18%로 늘었다.`

| | 예상 | 실제 |
|---|---|---|
| 판단 | 성공 승격 아님 | `지금은 판단을 보류한다` · deferred / S1 |
| CU | 반복 가능으로 퇴직 금지 | `유료 전환 이후 … 누락 수치가 실제로 줄었는가.` |
| Rejudgment | down | CONFLICT · delta=down |
| 다음 Action | 지표 전후를 다시 봄 | `이미 돈을 낸 후보에서 … 누락의 전후를 한 번 잰다.` |

악화를 유지 성공으로 읽지 않는다.

### 4. 다음 기간 측정 예정

**입력:** `다음 기간 성과를 측정할 예정이다.`

| | 예상 | 실제 |
|---|---|---|
| class | CLAIM | CLAIM |
| 판단 | 추가 승격 없음 | viable / S3 유지 · delta=unchanged |
| CU | next-period 유지 | `이번 성과가 다음 고객이나 다음 기간에도 같은 방향으로 이어지는가.` |

VALIDATED 아님. CU 퇴직 없음.

### 5. 다른 metric — 부하 41%→19%

**입력:** `다음 기간에도 부하가 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.`

| | 예상 | 실제 |
|---|---|---|
| 판단 | S3 유지 | viable / S3 |
| CU | 반복 가능 | `현재 강점이 반복 가능한 사업으로 이어지는가.` |
| 질문 | 두 번째 행동 | `이미 구매하거나 결제한 고객 중에서, 두 번째 행동이나 반복 사용이…` |

누락과 같은 의미 규칙. 사업명 분기 없음.

## 독립성

- `#128` 코드 파일 0-diff (`71df6f9`)
- referee는 `score-si-conversation-quality.ts`를 import하지 않음
- 사업명 토큰 없음
- `#127` 미포함

## STOP

코드 수정 · `#128` commit · `#127` 변경 · Merge · Production · CEO Founder Test: **없음**.
