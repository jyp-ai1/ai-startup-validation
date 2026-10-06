# S.I. Decision Quality / Founder Outcome Calibration

**PR:** #103  
**Branch:** `cursor/si-decision-quality-e648`  
**Base:** PR #102 Question DCE Ask CLOSED  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-founder-outcome.json`  
**금지:** 새 기능 · UI · 엔진 수정 · 사업별 patch · GPT 문장 복사 · Production

PR #99~#102는 루프가 **돌아가는지**를 봤다. 이번 Gate는 루프가 Founder의 **의사결정**을 돕는지 측정한다.

두 점수를 섞지 않는다.

| 점수 | 질문 | 출처 |
|---|---|---|
| directionMatch | GPT/Gemini와 판단 방향이 같은가 | PR #99/#100 first-pass |
| founderOutcome | 검증/중단/집중이 읽히고, 부분 답이 판단을 거짓으로 올리지 않는가 | 이번 Gate |

엔진은 고치지 않았다.

## 8항

1. 최초 Judgment  
2. 핵심 Risk  
3. CU  
4. DCE  
5. Validation Priority  
6. AI PM 질문  
7. 답변 후 Judgment 변화  
8. Founder가 검증/중단/집중할 것이 명확한가  

## 5사업

| 사업 | 방향 일치 | 검증/중단/집중 | 재판단 정직 | Founder Outcome |
|---|---|---|---|---|
| 주인집 | PASS | PASS | PASS | **PASS** |
| LMULM | PASS | PASS | PASS | **PASS** |
| RIDM AI | PASS | PASS | PASS | **PASS** |
| 클리닉플로우 | PASS | PASS | **FAIL** | **FAIL** |
| 핏브릿지 | PASS | PASS | **FAIL** | **FAIL** |

```text
MEASURED — 방향 5/5 PASS
Founder Outcome 3 PASS / 2 FAIL
엔진 미수정
```

t0에서 5사업 모두 검증/중단/집중 문장은 읽을 수 있다. 방향 일치와 Outcome이 갈라지는 지점은 **7번 재판단**이다.

## 클리닉플로우 · 핏브릿지 — 방향은 같고 의사결정은 갈라짐

t0 질문은 DCE를 묻는다 (no-show / 반품률 전후 + 결제).

kind 정답 픽스처는 **지불만** 넣고 지표 전후는 넣지 않는다.

| 층 | 클리닉플로우 t1 |
|---|---|
| 답 | 결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다 |
| 헤드라인 | 현재 판단: **사업화 가능성이 높음** (viable / S3) |
| CU | 유료 전환 이후 no-show가 줄었는가. 지불만 있으면 확정할 수 없다 |

DCE는 “지불만 있으면 보류를 유지한다”고 했는데, 헤드라인은 올린다. Founder는 **가도 된다**와 **아직 확정하지 마라**를 동시에 받는다.

핏브릿지도 같다. 반품률 전후 없이 결제만으로 viable/S3.

이것이 “GPT와 방향이 같다”와 “더 좋은 사업 의사결정”의 차이다. 고치지 않았다.

## 고정

- Analyzer / Presenter 사업명 분기 없음
- `decideNextQuestionFromReview` 미사용
- Production 불변. CEO 재테스트 없음.
