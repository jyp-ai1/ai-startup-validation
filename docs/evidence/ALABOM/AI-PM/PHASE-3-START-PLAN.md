# Phase 3 착수 계획

2026-11-01 00:08 KST. Phase 2.1은 PASS다. 이 문서는 구현 전에 확정할 계획이다.

이번 턴에 하지 않은 일: 스키마 적용, 마이그레이션 실행, 코드 변경, GPT 호출, 기존 행 수정, UI 구현, Production 배포.

구현 승인은 아직 없다. 이 계획은 제품 품질 PASS도, 분기 격리가 이미 검증되었다는 뜻도 아니다. Production은 잠금이다.

기준 설계: `docs/evidence/ALABOM/AI-PM/PIVOT-ARCHITECTURE-DESIGN.md` 13절.

## 보고

| 항목 | 상태 |
| --- | --- |
| 작업 범위 | 분기 식별, 보존용 마이그레이션, 무결성 제약, 복귀·재선택 시나리오, 호환 범위, 착수 순서 |
| 변경 파일 | 이 문서, `docs/TASKS.md` 상태 한 줄 |
| 변경 DB 구조 | NOT RUN |
| 기존 기능 영향 | 없음 |
| 테스트 결과 | NOT RUN |
| GPT 실제 호출 여부 | NOT RUN |
| 실제/시뮬레이션 구분 | 새 답을 만들지 않음 |
| 미해결 문제 | 구현 승인 전. 라이브 DB 재조회는 NOT RUN |
| 잔여 작업 | 승인 뒤에만 6절 순서로 착수 |

---

## 1. 분기 식별과 데이터 소유

확정: `user_id`와 `project_id`는 워크스페이스다. `parent_review_id`만으로는 분기를 구분할 수 없다. 별도 `branch_id`가 필요하다.

근거는 현재 저장소다. `listReviews`는 `user_id`와 `project_id`만으로 프로젝트의 검토를 모두 가져온다. `listFeedback`은 `user_id`와 선택적 `review_id`다. 분기 컬럼은 없다.

`parent_review_id`가 분기가 되지 못하는 이유:

- 새 분기의 1차 분석은 부모가 null이다. 기존 1차 `0a13c604`와 실패 행 `3be5715e`도 부모가 null이다. null끼리는 한 분기로 묶이지 않는다.
- 같은 프로젝트 안에 판단 실험 계보가 따로 있다. 부모를 따라가도 그 계보는 양조장 성공 체인과 다른 줄이다. 프로젝트 목록은 그 줄들을 한곳에 올린다.
- 부모 포인터는 단계의 앞뒤만 말한다. 그 줄이 어느 사업 분기인지는 말하지 않는다. 피벗 1차의 부모를 null로 두는 설계는 옛 체인으로 걸어 들어가지 않게 하려는 것이지, 분기 이름을 대신하지 않는다.

소유는 다음처럼 고정한다.

| 자료 | 어느 분기인지 아는 방법 |
| --- | --- |
| 검토 | `consulting_branch_members`의 `review_id`. `review_id`는 표 전체에서 한 번만 있다 |
| 답변 | 피드백의 `review_id`가 가리키는 멤버의 `branch_id`. 피드백에 분기를 복사하지 않는다 |
| 프로필 | 프로필 행의 `branch_id`. 그 `review_id`는 같은 분기의 멤버여야 한다 |
| 피벗 사건 | `source_branch_id`, `target_branch_id` |
| 계보 링크 | `branch_id`와 질문 검토, 인용 검토 |
| 지금 연 분기 | 그 사용자의 최신 초점 행. 초점 행은 소유가 아니다 |

한 검토를 두 분기의 멤버로 넣지 않는다. 새 사업은 옛 검토를 복사해 멤버로 삼지 않고, 필요할 때만 refId로 인용한다.

`parent_review_id`의 남은 역할은 이미 같은 `branch_id`의 멤버인 검토들 사이에서 단계 순서를 읽는 것이다. 부모가 다른 분기의 멤버이거나 멤버가 아니면 그 가지를 분기에 포함하지 않고, 불일치로 남긴다. 새 1차의 부모는 null이라 그 가지가 없다.

마지막 성공 분석은 `callCount >= 1`만으로 고르지 않는다. 그 조건은 질문 보유 행을 걸러 내는 보조다. `e3d42c90`은 `succeeded`이면서 호출이 0이다. 기준은 아래를 모두 만족하는 멤버다.

1. `branch_id`가 지금 보는 분기와 같다.
2. `role`이 `stage_review`다. `question_holder`와 `failed_source`는 빠진다.
3. 검토 `status`가 `succeeded`다.
4. `sections`가 있다.
5. `callCount`가 1 이상이다. 이 항은 호출이 있었던 분석인지 확인하는 보조다. 이 항만으로 프로젝트 전체에서 최신을 고르지 않는다.

그중 `finished_at`이 가장 늦은 행이 그 분기의 마지막 성공 분석이다. 같으면 `version`이 큰 행이다. 다른 분기의 성공 행과 Preview 실험 행은 멤버가 아니므로 후보가 아니다. 멤버가 하나도 없으면 프로젝트의 마지막 검토로 대체하지 않는다.

분기 A의 첫 멤버는 설계에 적은 여섯 검토뿐이다. `0a13c604`, `9e169fef`, `970b8ce1`, `cbf201a2`가 `stage_review`다. `e3d42c90`은 `question_holder`다. `3be5715e`는 `failed_source`다. 판단 논리 d/e/f와 그 밖의 실험 행은 멤버로 넣지 않는다.

진행 중 단계는 그 분기의 `question_holder`이거나, `stage_review`가 만든 질문 중 아직 답이 없는 질문 행이다. 답이 있는지는 그 검토의 피드백만 본다. 다른 분기의 피드백을 세지 않는다.

복귀 위치는 저장 컬럼이 아니다. 진행 중 단계가 있으면 그 행을 열고, 없으면 위 마지막 성공 분석을 연다.

초점의 키는 `user_id`와 `project_id`다. 그것은 “이 사용자가 이 워크스페이스에서 연 분기”다. 검토와 답과 프로필의 소속 키는 `branch_id`다.

---

## 2. 기존 데이터 보존을 위한 마이그레이션과 롤백

승인 뒤에 파일로 추가할 마이그레이션은 CREATE TABLE만 한다. `ai_pm_reviews`와 `ai_pm_feedback`에는 컬럼을 더하지 않고, UPDATE와 DELETE를 하지 않는다.

추가 표:

- `consulting_branches`
- `consulting_branch_members`
- `consulting_pivot_events`
- `consulting_lineage_links`
- `consulting_branch_focus`
- `consulting_model_calls`
- `consulting_business_profiles`

기존 저장소의 `assignProjectIfUnset`은 `project_id`가 비어 있는 검토를 UPDATE 한다. 피벗 구현은 이 메서드를 호출하지 않는다. `deleteForUser`와 `deleteForProject`도 호출하지 않는다.

적용 순서는 승인과 보존 확인 다음이다.

1. 적용 전에 여섯 검토와 피드백 `7d2d04e5`의 `finished_at`, `status`, 피드백 본문 해시를 읽어 증거 파일에 적는다. 이 읽기는 수정이 아니다.
2. 그 값이 커밋된 4차·5차 증거와 다르면 CREATE도 멤버 삽입도 멈추고 BLOCKED로 보고한다.
3. 값이 같을 때만 빈 표를 만든다.
4. 분기 A와 여섯 멤버, 계보 링크, 그 사용자의 초점 행을 INSERT 한다.
5. 삽입 뒤에 1의 값을 다시 읽는다. 하나라도 달라지면 새 표의 그 삽입을 롤백하고 기존 표는 그대로 둔다.

과거 요청 전문은 넣지 않는다. 4차 증거 파일이 그 호출의 전문이다. 1차와 3차는 요청이 행에 없으므로 만들지 않는다.

분기 A의 과거 섹션으로 프로필 버전을 채워 넣지 않는다. 단계 행은 고객과 가치 칸이 비어 있다. 그 빈 칸을 프로필의 확정 문장으로 만들면 없는 사업 내용을 만드는 것이다. 프로필 표는 승인된 새 분석이 쓸 때까지 비어 있다. 화면은 지금까지처럼 해당 검토의 `sections`를 읽는다.

롤백은 새 표만 역순으로 DROP 한다. `ai_pm_reviews`와 `ai_pm_feedback`은 DROP하지 않는다. DROP 뒤에 여섯 검토의 `finished_at`이 적용 전 기록과 같은지 다시 읽는다.

Production에는 이 파일을 적용하지 않는다. CEO 승인은 별도다.

---

## 3. 계보 링크와 프로필의 무결성 제약

계보 링크 INSERT가 거절되는 경우:

- `feedback_id`, `answered_question_id`, `answered_question_review_id`, `answered_question_text`, `question_relation`, `citation_reason`, `source_status` 중 하나가 비어 있다.
- `question_relation`이 `same_question`도 `different_question`도 아니다.
- `different_question`인데 `compared_question_id` 또는 `compared_question_review_id`가 비어 있다.
- 답 스냅샷의 `choice_id`, `choice_label`, `supplement`가 그 피드백 행과 다르다.
- `citing_review_id`가 있는데 그 검토가 멤버가 아니다. 예외는 링크를 만들기 전에 소속을 넣는 순서뿐이다. 인용 검토를 먼저 멤버로 넣는다.
- 같은 `(feedback_id, answered_question_id, citing_review_id, question_relation)`이 이미 있다. 다시 넣으면 `wrote: false`이고 기존 링크는 그대로다.

요청을 만들기 전에 빌더가 거절하는 경우:

- `different_question`인데 답의 `feedbackId`가 `notThisQuestion` 아래나 비교 질문 ID 아래에 있다.
- 유지 목록에 없는 피드백 본문을 `retained`에 넣는다.
- `not_sent_ref_ids`의 본문을 요청 JSON에 넣는다.

프로필 INSERT가 거절되는 경우:

- `branch_id`가 없다.
- `review_id`의 멤버 `branch_id`가 프로필의 `branch_id`와 다르다.
- `previous_profile_id`가 다른 분기의 프로필이다.
- 사업 B의 첫 버전인데 `previous_profile_id`가 있다.
- 필수 키 `idea`, `customer`, `problem`, `value`, `offer`, `revenueModel`, `market`, `operations`, `supply`, `competition`, `verification`, `judgment` 중 하나가 빠졌다. 빠진 키를 이전 버전이나 다른 분기에서 복사하지 않는다.
- 라벨이 다른 값을 `founderFacts`, `operations`, `operatingModel`, `execution`, `inferences`에 복사한다.

프로필과 링크와 멤버에는 UPDATE 메서드를 만들지 않는다.

---

## 4. 테스트 시나리오

채팅은 주입한다. `evidence`는 `injected_http`다. 라이브 키와 Preview 빌드 스크립트에는 이 시나리오를 넣지 않는다. 이번 계획에서는 실행하지 않는다.

### 분기 전환

1. 분기 A에 여섯 멤버만 있다. 프로젝트의 다른 성공 검토는 조회에 나오지 않는다.
2. 피벗 확정은 분기 B와 부모 null인 새 1차와 초점 행을 만든다. A의 멤버 수와 `status`는 그대로다.
3. B의 마지막 성공 분석은 B의 `stage_review`만 본다. A의 `cbf201a2`가 더 최근이어도 B의 결과로 고르지 않는다.
4. 확정 전 취소는 분기 행, 멤버, 초점 행이 늘지 않는다.

### 복귀

1. B를 연 뒤 A로 초점 행을 하나 더 넣는다.
2. B의 멤버, 검토 `status`, 피드백 수, 프로필 버전이 같다.
3. A에 답이 없는 질문 보유 `e3d42c90`이 있으면 복귀 위치는 그 행이다. 그 행은 마지막 성공 분석이 아니다.
4. 그 질문 보유에 모든 답이 있고 그 분기 안에 성공 분석이 있으면 복귀 위치는 1절의 마지막 성공 분석이다.
5. 다른 사용자의 최신 초점 행은 바뀌지 않는다.

### 제외 자료 재선택

1. 첫 확정에서 피드백 `7d2d04e5`를 보내지 않으면 요청 본문에 그 문장이 없고, 피드백 행은 남는다. `not_sent_ref_ids`에 그 ID가 있다.
2. 선택 목록을 다시 열면 그 피드백이 원본에서 다시 보인다.
3. 다음 확정이 그 ID를 고르면 새 피벗 사건의 `retained`에만 들어간다. 첫 사건의 `not_sent_ref_ids`는 그대로다.
4. 재선택 요청에서도 그 답은 `3be5715e`의 질문과 한 쌍이다. `0a13c604`의 질문 아래에는 붙지 않는다.

### 같이 볼 회귀

| 시나리오 | 기대 | 호출 |
| --- | --- | --- |
| 질문 2개 중 일부만 답 | `pending` | 0 |
| 질문 2개 모두 답, 같은 해시 재제출 | 기존 자식 | 0 |
| 질문 1개이고 답 없음. `e3d42c90` 포함 | 호출 없음 | 0 |
| `nextQuestion`만 있는 옛 행 | 단계로 열지 않음 | 0 |
| 형식 오류 | `failed`와 raw. 재호출 없음 | 주입 1 |
| 여섯 검토의 `finished_at` | 시나리오 전후가 같음 | 0 |

5차 답이 저장되는 일은 이 시나리오와 섞지 않는다. 그때의 호출은 이미 잠긴 별도 1회 절차다.

---

## 5. 기존 상담과의 호환과 영향 범위

승인된 구현의 첫 조각은 새 표와 멤버와 링크와 읽기 규칙이다. 아래 함수의 동작을 그 조각에서 바꾸지 않는다.

| 경로 | 유지하는 동작 | 나중에 바꾸는 조건 |
| --- | --- | --- |
| `POST /api/ai-pm-review` `runFirstReview` | 같은 원문 sha의 최신 성공을 재사용 | 피벗 1차는 이 함수를 호출하지 않는다 |
| `POST /api/ai-pm-review/feedback` | 모델 0회. 새 피드백 INSERT | 없음 |
| `POST /api/ai-pm-review/follow-up` | 질문 2개 미만이면 `stage_questions_missing`. 일부 답은 `pending` | 질문 1개 허용은 링크가 요청에 들어간 뒤의 별도 조각 |
| `acceptedStageQuestions` | 지금처럼 2개 이상 | 위와 같은 조각에서만 |
| `judgeStageContract` | 지금 매핑. 옛 행을 다시 저장하지 않음 | 프로필 복사 금지는 새 작성 경로에만 적용 |
| `matchReview` | 승인 전에는 그대로 | 화면 조각이 선택한 분기의 멤버만 연다 |
| `openReviewChat` | 기존 상담이 그대로 사용 | 피벗 1차는 어댑터 직접 1회 |
| `apps/web/scripts/run-web-build.sh`의 4차 라이브 테스트 | 마커가 있으면 호출하지 않음 | 5차나 피벗 호출을 이 스크립트에 넣지 않는다 |

GET 목록의 기본 응답은 프로젝트의 기존 검토를 그대로 돌려준다. 분기 필터는 새 읽기 인자다. 기본 목록을 멤버만 보게 바꾸면 지금 화면이 실험 행과 함께 보던 동작이 바뀐다. 그 변경은 화면 조각에만 둔다.

질문 1개를 제품 단계로 여는 조각은, `answeredPairs`가 계보 링크를 포함하기 전에는 `e3d42c90`의 제출을 분석으로 넘기지 않는다. 질문 개수만 낮추면 실패 행의 답이 빠진다.

영향이 없는 곳: 랜딩, 인증 구조, 결제, `startup_projects`의 기존 컬럼, 사업계획서 A/B.

---

## 6. 착수 순서와 단계별 증거

각 줄은 앞줄의 증거가 있기 전에는 시작하지 않는다. 지금은 전부 NOT APPROVED다.

| 순서 | 하는 일 | 증거 | GPT |
| --- | --- | --- | --- |
| 0 | 이 계획 | 이 문서와 PR | NOT RUN |
| 1 | 1절과 3절을 어기면 실패하는 단위 테스트. 구현 전이라 실패해도 된다 | 테스트 이름과 실패 또는 통과 로그. 라이브 키 없음 | 0 |
| 2 | CREATE TABLE 마이그레이션 파일을 저장소에 추가 | SQL 파일. 데이터베이스에는 적용하지 않음 | 0 |
| 3 | 보존 읽기. 여섯 검토와 피드백 `7d2d04e5`의 `finished_at`과 본문 해시 | 증거 JSON. 불일치하면 BLOCKED | 0 |
| 4 | 빈 표 적용과 분기 A 멤버·계보 링크·초점 INSERT | 삽입 전후 `finished_at`이 같다는 기록. 멤버는 여섯 행뿐 | 0 |
| 5 | 마지막 성공 분석과 복귀 위치 읽기 | A의 결과는 `cbf201a2`. `e3d42c90`과 실험 계보는 제외 | 0 |
| 6 | 주입 채팅으로 4절의 전환, 복귀, 재선택 | 테스트 로그. B가 A의 성공 행을 집지 않음 | 0 |
| 7 | 질문 1개 규칙을 연다. 계보 쌍이 요청에 있을 때만 | 답 없는 `e3d42c90`은 호출 0. 기존 질문 2개 회귀 통과 | 0 |
| 8 | 새 분석의 프로필 버전. 라벨이 다른 칸으로 복사하지 않음 | 프로필 행과 원본 섹션이 따로라는 테스트 | 주입 1 또는 0 |
| 9 | 실제 GPT | 별도 승인. 요청·응답 원문. 품질 PASS는 CTO가 적지 않음 | 승인된 1회 |

2번 파일을 만들었다고 3번 적용이 따라오지 않는다. 4번 적용은 3번 기록이 커밋된 증거와 같을 때만이다.

5차 Founder 답이 이 순서 중간에 저장되면, 그 분석은 7번 제품 경로로 돌리지 않는다. 잠긴 별도 1회 절차로 새 행을 만들고 부모는 `e3d42c90`이다.
