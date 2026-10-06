# S.I. Decision Quality Follow-up — MEASUREMENT COMPLETE

**PR:** 측정 전용 (Fix 아님)  
**Branch:** `cursor/si-decision-quality-followup-e648`  
**Base / Baseline:** PR #104 PASS CLOSED · SHA `fbf6f1c`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-decision-quality-followup.json`  
**금지:** 엔진 수정 · UI · Production · 사업명 분기 · `decideNextQuestionFromReview` · 신규 SoT · #104 기준선 변경

#104 이후 **고쳐야 할 문제가 남아 있는가**를 측정한다. Partial DCE Promotion은 수정하지 않았다. 클리닉플로우/핏브릿지 기본 kind 경로의 PARTIAL은 유지한다.

## Founder 4항

답변 후 아래가 동시에 읽히는가.

1. 지금 판단이 무엇인가  
2. 무엇이 아직 미검증인가  
3. 판단을 바꾸려면 어떤 증거가 필요한가  
4. 다음 검증 행동이 무엇인가  

## 10행 (2사업 × 5시나리오)

| 사업 | 시나리오 | Judgment | Stage | 4항 | 실패 유형 |
|---|---|---|---|---|---|
| 클리닉플로우 | 전체 DCE (지불 + no-show 18%→9%) | viable | **S3** | PASS | **stale_cu_after_full_dce** |
| 클리닉플로우 | 일부 DCE (지불만) | deferred | **S1** | PASS | 없음 |
| 클리닉플로우 | 미충족 (의향만) | deferred | S1 | PASS | 없음 |
| 클리닉플로우 | 추가 증거 (지불 + 재결제, 지표 없음) | deferred | S1 | PASS | 없음 |
| 클리닉플로우 | 모호한 답 | deferred | S1 | PASS | 없음 |
| 핏브릿지 | 전체 DCE (지불 + 반품률 32%→20%) | viable | **S3** | PASS | **stale_cu_after_full_dce** |
| 핏브릿지 | 일부 DCE (지불만) | deferred | **S1** | PASS | 없음 |
| 핏브릿지 | 미충족 | deferred | S1 | PASS | 없음 |
| 핏브릿지 | 추가 증거 | deferred | S1 | PASS | 없음 |
| 핏브릿지 | 모호한 답 | deferred | S1 | PASS | 없음 |

```text
#104 회귀: 지불만 → S3 = 0
재판매 질문 회귀 = 0
4항 가독성 10/10 PASS
남은 결함: full DCE 2행에서 CU가 이미 받은 지표를 미검증으로 말한다
엔진 미수정
```

## #104 기준선 — 유지

지불만 / 의향만 / 추가 지불 / 모호한 답은 모두 `judgment_deferred` / S1이다. Headline은 “사업화 가능성이 높음”이 아니다. Inference는 지불만일 때 `DCE는 부분`이다.

부분 상태의 다음 행동은 분명하다.

```text
돈은 받았다.
핵심 운영지표는 아직 검증되지 않았다.
따라서 판단을 올리지 않는다.
이미 돈을 낸 후보에서 지표 전후를 한 번 잰다.
```

## 남은 결함 — stale CU after full DCE

전체 DCE를 넣으면 Stage는 올바르게 S3로 오른다. 그런데 CU·DCE·Priority·다음 질문은 여전히 “지불만 있으면 확정할 수 없다 / 지표 전후를 재라”를 반복한다.

Founder는 동시에 듣는다.

```text
Headline = 사업화 가능성이 높음
CU      = no-show(또는 반품률)가 줄었는가. 지불만이면 확정 불가
Ask     = 방금 답한 같은 전후 질문
```

#104가 막은 것은 **부분 증거 → 거짓 확신**이다. 이번에 측정된 것은 **전체 증거 이후에도 미검증 문장이 퇴직하지 않음**이다. 엔진은 고치지 않았다.

## 회귀 고정

- 주인집 / LMULM / RIDM t0 질문 lock
- Analyzer / Presenter 사업명 토큰 없음
- `decideNextQuestionFromReview` 미사용
- 클리닉/핏브릿지 다음 질문에 `재판매` 없음
- Production 불변. CEO 재테스트 없음.

## 판정 요청

Fix PR은 열지 않는다. CPO가 `stale_cu_after_full_dce`를 다음 정확도 Gate로 볼지 판단한다.
