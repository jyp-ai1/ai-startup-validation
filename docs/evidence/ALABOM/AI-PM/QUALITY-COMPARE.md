# quality-2 / quality-3 비교 호출

2026-10-29 12:54 KST. 제품 프롬프트와 2차 호출 경로는 바꾸지 않았다. Production은 잠금이다. PR #209는 병합하지 않는다.

전달 문장과 빈 응답 칸은 `docs/evidence/ALABOM/AI-PM/quality-2-3-compare.json`에 있다.

| 항목 | 값 |
|---|---|
| 모델 | `gpt-4o-mini` |
| temperature | 0.2 |
| 출력 상한 | 2400 |
| 형식 | JSON |
| 사업 입력 | `juinjip11-input.txt` 본문과 `검토 목적: 종합 사업성 검토`, `현재 단계: 미확인`, `가장 알고 싶은 것: 없음`, `검토 계약: comprehensive-1` |
| `quality-2` | 제품 `buildFirstReviewRequest`와 같은 요청. 상태 `not_run`. 원문 없음 |
| `quality-3` | CPO 초안. 버전 표기 `quality-3-draft`. 상태 `not_run`. 원문 없음 |
| 실행 | **NOT RUN**. 이 프로세스에 `GPT_API_KEY`가 없다 |

혼란 변수:

- `quality-2` 사용자 키 목록에는 `alternatives`, `differentiation`이 없고 `quality-3`에는 있다. 응답 차이가 생겨도 시스템 지시만의 효과로 단정하지 않는다.
- `quality-3`를 제품 입력 예산에 넣으면 사용자 문장이 633자에서 218자로 잘린다. 비교 호출은 그 자르기를 쓰지 않고 전문을 보내도록 고정했다. 그 호출은 아직 실행되지 않았다.

회귀 A/B와 사업성 비교는 원문이 없어 **NOT RUN**이다. 1차 게이트는 **FAIL**이다.
