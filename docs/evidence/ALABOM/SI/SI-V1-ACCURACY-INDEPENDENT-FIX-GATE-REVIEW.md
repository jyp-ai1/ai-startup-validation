# [FIX GATE REVIEW] — #194 원본 × 코드 경로

**Fix Gate:** 여전히 **CANDIDATE**. 이 문서는 개방 여부를 CPO가 결정하기 위한 원본·경로 대조다.  
**엔진 수정:** 없음. Analyzer / Judgment / SoT 미변경.  
**Production:** `0b46522` UNCHANGED  
**Dump SHA Lock:** `a79c81c`  
**Live replay:** `si-v1-accuracy-independent-codepath.json` — 48장면 전부 dump 판정과 **일치**  
**Preview:** UNVERIFIED. #194 재시도 없음. 이 문서를 Preview PASS로 쓰지 말 것.

원본 입력은 `si-v1-accuracy-independent-cpo-2pass.json`과 동일하다. 아래는 그 원본을 `analyzeStrategicIntelligence`에 다시 넣어 게이트를 읽은 결과다.

---

## A1. 지불만으로 S3

**원본 답(예, 냉동물류):** `물류사 2곳이 월 구독을 결제했다.`  
`hasCountedPaidConversion` = true (`quantity-unit.ts` L83–88, `결제했` + `2곳`).  
분류기는 VALIDATED (`classify-founder-evidence.ts` L27).

| | `STAKE_NOUN` hit | `quantified_problem` (L296) | `dceStakeOpen` (L607) | 이후 |
|---|---|---|---|---|
| 온도 초과 · 재작업 · 공회 · 급유 지연 · 치수 불량 · 잔반 | 없음 | 라인 0 | **false** | **S3 / conditionally_viable** |
| 노쇼 · 불일치 | 있음 | 원문 `%` 라인 1 | **true** | **S0 / judgment_deferred** |

경로:

1. 지불 수량 → `revenue` VALIDATED (L269–270).
2. `decideStage` L622–624: `paymentWithoutStake = revenue && dceStakeOpen`. `dceStakeOpen`이 false면 지불이 **S3**.
3. `decideVerdict` L655: `dceStakeOpen`이면 보류. 아니면 L660 `stageId === S3 && hasRevenue` → 조건부.

**구분 실패:** 지불 사실(`hasCountedPaidConversion`)과 문제 해결(`quantified_problem` + `stake_improved`)이 `dceStakeOpen` 한 게이트로만 묶여 있고, 그 게이트는 허용 목록 명사에만 켜진다. 실제 문제 해결이 없어도 S3가 된다.

허용 목록에 `온도 초과`를 넣는 것은 A1만 가리고 A4의 다음 미등록 명사를 남긴다.

---

## A2. 부정 지표 악화 미반영

**원본 악화(냉동물류):** `다음 주에 온도 초과가 4건에서 13건으로 늘었다.`  
선행 full이 문서에 붙어 있다.

| | `isStakeWorsenedLine` (L103) | retraction (L463, L478) | CONFLICT | 이후 |
|---|---|---|---|---|
| 미등록 6 | **false** (목록 밖) | 없음 | 없음 | 조건부 S3 유지 |
| 노쇼 `12%→29%` | **true** | `stake_improved` retract | **있음** | 보류 S0 |
| 불일치 `5%→15%` | **true** | 동일 | **있음** | 보류 S0 |

기존 긍정(지불 VALIDATED, 그리고 허용 목록이면 `stake_improved`)이 우선한다. 미등록 악화는 신호로 안 들어가므로 하향 분기에 도달하지 않는다.

하향이 필요한 조건: 문서가 수치화한 **같은 지표**가 나빠진 것.  
실제 분기: `STAKE_NOUN.test(line)`가 먼저 false면 종료 (L104).

---

## A3. C2C 재판매 답 → S4

**원본 답(8사업 공통):**  
`최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.`

full 이후 CU(냉동물류): `현재 강점이 반복 가능한 사업으로 이어지는가` — 온도 초과 없음.  
임상·송금 full 이후 CU는 `다음 고객이나 다음 기간`. 재판매 답이 그 DCE가 아니다.

연결:

1. `hasCountedCompletion` true — `등록했` + `거래됐` + `35명`/`12건` (`quantity-unit.ts` L17, L90–95).
2. analyzer L267–268: 수량 완료 → `repeat_validation` VALIDATED. **현재 CU 축을 보지 않음.**
3. `C2C|재판매` → `resale_thesis` (L242–247).
4. `decideStage` L621: `repeat_validation` → **S4**.
5. `decideVerdict` L654: `hasRepeat && hasRevenue` → **viable**.

CU와 무관한 성과가 다른 축을 승격하는 일반 경로: **완료 동사 + 수량이면 repeat_validation**. 사업 종류·현재 askKind와 무관. 8/8 재현.

---

## A4. 미등록 지표 CU 누락

최초 문서만 넣었을 때:

| 문서 지표 | CU에 지표 | 최초 CU |
|---|---|---|
| 온도 초과 주 14건 | 아니오 | 가치가 실제 지불로 이어지는가 |
| 재작업 19% | 아니오 | 동일 |
| 공회 42% | 아니오 | 동일 |
| 급유 지연 18% | 아니오 | 동일 |
| 치수 불량 22% | 아니오 | 동일 |
| 잔반 28% | 아니오 | 동일 |
| 노쇼 31% | **예** | 수치화한 노쇼가 줄어드는가 |
| 불일치 16% | **예** | 수치화한 불일치가 줄어드는가 |

`pickCriticalUnknown` (L720+)는 `signals.find(quantified_problem)`가 있을 때만 지표 문장을 쓴다. `quantified_problem`은 `%` **그리고** `STAKE_NOUN` (L296–301). `주 14건`은 `%`가 없어도, `%`가 있는 재작업·공회·잔반도 명사가 목록 밖이면 탈락.

**채택하지 않을 해결:** `STAKE_NOUN`에 단어를 더하기. 사업명 하드코딩.

**검토만 한 일반 규칙 (미구현):**  
문서 한 줄에서 문제·악화 맥락의 수량(`%` 또는 `건`/`명`)에 **인접한 명사구**를 그 문서의 지표 토큰으로 추출한다. CU·DCE·개선·악화는 그 토큰에 묶는다. 목록이 아니라 문서에서 나온다.

---

## A5. 헤드라인 · 근거 · CU 충돌

wrong_axis 8/8 라이브 판단(동일 문장):

```
현재 판단: 사업화 가능성이 높음. 핵심 근거: 실제 판매·매출 증거가 있다. 핵심 리스크: 출시·매출 등 상업 실행 증거가 없다.
```

경로:

1. 원문 `아직 출시되지 않았고 매출은 없습니다` → `no_launch` / `no_revenue` FACT (L252–260). 철회되지 않음.
2. 이후 지불 → `revenue` VALIDATED. `buildStrengths` L816–817: `실제 판매·매출 증거가 있다`.
3. `buildRisks` L852–854: `no_revenue || no_launch`이면 `상업 실행 증거가 없다`를 **그대로** push.
4. `proseJudgment` viable (L887–890): strengths[0] + risks[0]를 한 줄에 붙임.

CU는 일반 반복. 세 문장이 한 설명을 이루지 않는다.

---

## 수정 원칙 (개방 후에만 · 지금은 구현 안 함)

1. 허용 목록 확장 금지. 사업명 하드코딩 금지.
2. 지불(`hasCountedPaidConversion`) ≠ 문제 해결(문서 지표의 전후 개선).
3. 새 증거: 같은 지표 개선만 유지·승격, 같은 지표 악화는 하향, CU 밖 완료 수량은 승격 금지.
4. `repeat_validation`은 현재 askKind/CU 축과 맞을 때만.
5. VALIDATED 매출이 있으면 `no_revenue`를 헤드라인 리스크로 남기지 않음.

---

## Fix Gate 판정 (CTO)

근거는 원본 재실행으로 확인됐다. **개방 결정은 CPO.** CTO는 CANDIDATE를 유지하고 코드를 바꾸지 않는다.

---

## Vercel (별도 트랙 · 복구 아님)

| | |
|---|---|
| 오류 | `api-deployments-free-per-day` |
| 최초 거절 | 2026-10-08T18:02:05Z (`ede47bb`) |
| 이 리뷰 시각 | 2026-10-08T23:37Z · 경과 ~5.6h · 24h 시계면 ~2026-10-09T18:02Z |
| 대시보드 플랜·사용량·해제 | **미열람** (토큰 없음) |
| #192 / #193 dump status | 여전히 `Deployment rate limited — retry in 24 hours` (당시 기록) |
| `a79c81c` / `e399319` GitHub | `Deployment has completed` — **Preview PASS 아님. 복구 완료 아님. SSO 미검증. 재시도 안 함.** |
| Pro 업그레이드 | 안 함 |

`[VERCEL RECOVERY COMPLETE]` 선언하지 않는다.

---

## 잠긴 SHA

Production `0b46522` · #139 `0c362c7` · #140 · #192 `39f6f3d` · #193 `05da173` · #194 dump `a79c81c`
