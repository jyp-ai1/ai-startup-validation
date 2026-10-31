# ALABOM 피벗 아키텍처 설계

Phase 2 설계. 2026-10-31 23:44 KST에 초안을 적고, 23:53 KST 조건부 PASS의 네 가지 보완을 13절에 반영했다. 13절이 4·5·6·7·9절과 다르면 13절을 따른다.

이 문서는 설계만 담는다. 스키마 적용, 마이그레이션 실행, GPT 호출, 기존 행 수정, 상담 로직 수정, UI 구현, Production 배포는 하지 않았다. 구현은 NOT APPROVED다.

기준 조사: `docs/evidence/ALABOM/AI-PM/CONSULTING-ARCHITECTURE-CURRENT.md`.

## Phase 2 보고

| 항목 | 상태 |
| --- | --- |
| 작업 범위 | 분기, 피벗, 계보 증명, 프로필 버전, 제외와 보존, 활성 분기 복귀 |
| 변경 파일 | 이 문서, `docs/TASKS.md` 상태 한 줄 |
| 변경 DB 구조 | NOT RUN. 아래 11절은 적용 계획이다 |
| 기존 기능 영향 | 없음. 코드를 바꾸지 않았다 |
| 테스트 결과 | NOT RUN |
| GPT 실제 호출 여부 | NOT RUN |
| 실제/시뮬레이션 구분 | 새 답을 만들지 않았다. 계보 ID는 커밋된 증거다 |
| 미해결 문제 | 라이브 DB·브라우저 재확인은 여전히 NOT RUN. 설계 검토 전 구현 불가 |
| 잔여 작업 | Phase 3 구현 NOT APPROVED |

설계 원칙:

- 기존 `ai_pm_reviews`와 `ai_pm_feedback` 행은 수정하거나 삭제하지 않는다.
- 새 사업은 옛 체인의 다음 단계가 아니다. 새 분기의 1차 분석이다.
- 옛 판단, 미검증 주장, 검증 상태는 자동으로 넘어가지 않는다.
- 코드는 사업성, 다음 질문, 피벗의 실제 범위를 결정하지 않는다.
- 질문 개수는 1개도 N개도 단계다. 생성된 질문이 모두 답해졌는지만 본다.
- 실패하면 원문 응답을 남기고 수리 재호출을 하지 않는다.

---

## 1. 현재 구조와 목표 구조

### 현재

```text
startup_projects
  └── ai_pm_reviews
        parent_review_id 한 줄
        record_json 안에 원문, 섹션, rawContent
        └── ai_pm_feedback
```

`project_id`는 워크스페이스다. 상담 분기가 아니다. 단계 결과의 `judgeStageContract`는 고객, 문제, 시장, 수익, 실행, 가치, 운영 필드를 빈 문자열로 저장한다. 질문 배열이 2개 미만이면 `acceptedStageQuestions`가 단계를 거절한다. 요청 메시지 원문은 행에 없다.

양조장 성공 체인과 Founder 답은 이미 분리되어 있다.

```text
0a13c604 → 9e169fef → 970b8ce1 → cbf201a2 → e3d42c90
3be5715e 에 피드백 7d2d04e5
```

`parent_review_id`를 고쳐 이 둘을 한 줄로 붙이지 않는다. 질문 문장이 다르다는 사실까지 지워지기 때문이다.

### 목표

```text
startup_projects
  └── consulting_branches
        ├── Branch A  (기존 상담)
        │     ├── 기존 검토 행을 멤버로 참조
        │     ├── Stage 들 (기존 parent_review_id)
        │     └── pivot event → Branch B
        └── Branch B  (새 방향)
              ├── 새 1차 검토. parent_review_id 는 null
              ├── 그 이후 단계만 B 체인
              └── 유지·제외는 참조 목록
```

새 테이블은 참조만 저장한다. 옛 검토를 복사해 새 사업의 원본처럼 만들지 않는다.

재사용: 검토·피드백 삽입 경로와 `parent_review_id` 단계 체인은 유지한다. 분기와 피벗은 새 테이블이다. `runFirstReview`의 원문 sha 재사용은 피벗 1차에 쓰지 않는다. 같은 문장이 옛 성공 행을 돌려주면 새 분기가 생기지 않는다.

---

## 2. 상담 분기 데이터 모델

새 테이블만 사용한다. `ai_pm_reviews`에 컬럼을 추가하지 않는다. 옛 행을 UPDATE 하지 않기 위해서다.

### `consulting_branches`

| 필드 | 의미 |
| --- | --- |
| `branch_id` | 분기 |
| `user_id`, `project_id` | 소유 워크스페이스 |
| `parent_branch_id` | 갈라져 나온 분기. 최초 분기는 null |
| `origin` | `original` 또는 `pivot` |
| `label` | 화면에 보이는 짧은 방향. Founder가 확정한 문장 |
| `created_at` | 생성 시각 |

최초 분기 A는 기존 프로젝트를 다른 사업으로 복제하지 않는다. A의 실체는 기존 검토 ID를 가리키는 멤버 행이다.

### `consulting_branch_members`

| 필드 | 의미 |
| --- | --- |
| `member_id` | 멤버 행 |
| `branch_id`, `user_id` | 소속 |
| `review_id` | 기존 또는 새 검토. 행을 복사하지 않는다 |
| `role` | `stage_review`, `question_holder`, `failed_source` |
| `created_at` | 삽입 시각 |

한 검토는 한 분기의 멤버다. 피벗은 그 검토를 B의 멤버로 다시 넣지 않는다. B가 옛 자료를 쓰는 경로는 멤버 복사가 아니라 6절의 참조 목록이다.

기존 양조장 체인에 대한 멤버 삽입은 새 테이블에만 한다.

| review | role | 이유 |
| --- | --- | --- |
| `0a13c604` | `stage_review` | 1차 성공 분석 |
| `9e169fef` | `stage_review` | 성공 체인의 중간 분석 |
| `970b8ce1` | `stage_review` | 3차로 다룬 분석 |
| `cbf201a2` | `stage_review` | 4차 분석 |
| `e3d42c90` | `question_holder` | 호출 0인 5차 질문. 분석 완료가 아니다 |
| `3be5715e` | `failed_source` | 답의 질문 원문. 성공 단계로 승격하지 않는다 |

피드백 `7d2d04e5`는 검토 멤버로 옮기지 않는다. 답은 지금처럼 `ai_pm_feedback`에 두고, 4절의 연결 행이 가리킨다.

### `consulting_branch_focus`

| 필드 | 의미 |
| --- | --- |
| `focus_id` | 사용자가 분기를 연 사건. 분기 행이 아니다 |
| `user_id`, `project_id`, `branch_id` | 그 사용자의 선택 |
| `created_at` | 시각 |

같은 `user_id`와 `project_id`의 최신 초점 행이 지금 선택한 분기다. 분기, 멤버, 검토, 피드백은 이 행과 별도다. 되돌리기는 초점 행만 추가한다. 마지막 분석과 진행 중 단계의 구분은 13.4절이다.

화면은 지금 `matchReview`가 같은 원문 텍스트의 마지막 `ready` 검토를 연다. 분기가 둘이면 그 규칙이 다른 분기의 최신 행을 집는다. Phase 3 화면은 초점 분기의 멤버만 연다. 그 전에도 기존 함수는 그대로 둔다.

재사용: `insertReview` / `insertFeedback`. 멤버 행은 새 포트다. 앱은 `@repo/db` 포트를 호출하고 Supabase SDK를 직접 쓰지 않는다.

---

## 3. 피벗 이벤트 데이터 모델

확정 전에 서버 행을 만들지 않는다. 초안은 브라우저에만 있다. 취소는 그 초안을 버린다. 기존 상담은 호출도, 종료도 없다.

확정 때 넣는 `consulting_pivot_events`는 불변이다.

| 필드 | 의미 |
| --- | --- |
| `pivot_event_id` | 피벗 사건 |
| `user_id`, `project_id` | 소유 |
| `source_branch_id` | 바꾸기 전 분기 |
| `target_branch_id` | 새 분기 |
| `founder_pivot_type` | Founder가 고른 `partial`, `direction`, `full` |
| `reason` | 이유 |
| `previous_direction` | 바꾸기 전 방향 문장 |
| `new_direction` | 바꾸려는 방향 문장 |
| `retained` | 이번에 GPT로 보낸 참조와 본문 스냅샷 |
| `not_sent_ref_ids` | 이번에 보내지 않은 원본의 ID. 원본 삭제도, 이후 재선택 금지도 아니다 |
| `notes` | 기타 설명 |
| `created_by` | 확정한 사용자 |
| `created_at` | 확정 시각 |
| `input_sha` | 위 입력의 해시. 같은 확정은 같은 사건을 돌려준다 |

모델이 판단한 변경 폭은 이 행에 쓰지 않는다. 피벗 행을 나중에 UPDATE 하지 않기 위해서다. 모델 출력은 새 검토 행의 `record_json`에만 둔다. 키는 `assessedPivotScope`다. Founder가 고른 유형을 코드가 덮어쓰지 않는다.

유형별 차이:

| 유형 | Founder 의미 | 분석 시작 | 자동으로 남는 것 |
| --- | --- | --- | --- |
| `partial` | 일부 요소 변경 | 새 분기의 1차 | 없음 |
| `direction` | 핵심 모델 변경 | 새 분기의 1차 | 없음 |
| `full` | 다른 사업 | 새 분기의 1차 | 없음 |

세 유형 모두 옛 3차의 다음 단계가 아니다. 피벗은 기존 사업의 실패가 아니다. 옛 검토의 `status`를 `failed`로 바꾸거나, 프로젝트 상태를 실패로 바꾸거나, 옛 상담을 폐기하지 않는다. 유형은 화면의 안내 문구만 다르게 한다. 체크박스는 모두 꺼진 채로 시작한다. 코드가 “부분 피벗이니 고객은 남긴다”라고 넣지 않는다.

새 1차 검토의 `parent_review_id`는 null이다. `inputText`는 `new_direction`이다. 옛 뿌리 `0a13c604`의 원문을 복사하지 않는다. `reviewChain`이 옛 사업으로 걸어 들어가지 않게 하려는 장치다.

재사용: 사건 저장은 새 테이블이다. 새 1차의 삽입은 `insertReview`다. `runFirstReview` 함수 자체는 재사용하지 않는다.

---

## 4. 기존 답변 계보 연결 방안

문제: 성공 체인의 질문과 Founder가 답한 질문이 다르다. `StoredReview.founderAnswerSource`는 이미 “피드백을 옮기지 않고 인용한다”는 형태를 갖고 있다. 단계 재분석 `runStageReanalysis`는 이 값을 `finishCall`에 넘기지 않는다. 이전 답으로 걷는 값도 `stageAnswers`뿐이다. 그래서 실패 행의 답은 제품 단계 요청에 자동으로 들어가지 않는다.

원본을 고치지 않는 연결 테이블 `consulting_lineage_links`. 한 행이 답의 출처를 증명한다. 필드 전체와 GPT에 넘기는 쌍 형태는 13.1절이 우선한다. 아래는 초안이다.

| 필드 | 의미 |
| --- | --- |
| `link_id` | 연결 |
| `user_id`, `project_id` | 소유 |
| `branch_id` | 이 연결을 읽는 분기. 역사 기록은 분기 A |
| `relation` | 아래 관계 |
| `feedback_id` | 답 행. 없으면 null |
| `question_review_id` | 질문 원문이 있는 검토 |
| `analysis_review_id` | 그 답을 읽어 판단한 검토. 없으면 null |
| `question_text` | 연결을 만들 때 읽은 질문 문장. 원본 행의 복사 수정이 아니다 |
| `choice_id`, `choice_label`, `supplement` | 답 스냅샷. 피드백 행과 다르면 연결을 만들지 않고 실패로 보고한다 |
| `created_at` | 삽입 시각 |

관계:

| relation | 의미 |
| --- | --- |
| `answers_question` | 이 피드백이 이 검토의 질문에 대한 답이다 |
| `question_differs` | 두 검토의 질문이 다르다. 성공 체인에 붙여 지우지 않는다 |
| `cited_by_analysis` | 이후 분석이 그 답을 입력으로 읽었다 |
| `retained_for_pivot` | 새 분기가 이 출처를 유지 목록에 넣었다 |
| `excluded_from_pivot` | 새 분기가 이 출처를 제외 목록에 넣었다 |

양조장 증거에 대해 넣을 연결은 다음뿐이다. 모두 새 행이다.

1. `answers_question`. 피드백 `7d2d04e5`, 질문 검토 `3be5715e`. 질문 문장은 그 행의 `rawContent`에서 읽는다. `sections.nextQuestion`이 비어 있다는 사실은 유지한다.
2. `question_differs`. 질문 검토 `0a13c604`와 `3be5715e`. 1차 성공 행의 질문은 파트너십 구축 계획이고, 답변 행의 질문은 협력 가능성이다.
3. `cited_by_analysis`. 같은 피드백을 `970b8ce1`, `cbf201a2`가 인용한 범위. 4차 요청 원문은 증거 JSON에 있다. 3차 요청 원문은 행에 없다. 3차 링크는 `founderAnswerSource`가 그 행에 있을 때만 만든다. 없으면 추측 링크를 만들지 않고 “요청 원문 없음”으로 남긴다.

유일 키는 `(relation, feedback_id, question_review_id, analysis_review_id)`다. 다시 넣으면 `wrote: false`이고 기존 링크는 그대로다.

요청에 넣는 형태는 13.1절의 `answeredPairs`다. 답은 실제 질문 객체 안에만 둔다. `different_question`인 비교 질문에는 그 답을 붙이지 않는다.

질문 개수 규칙을 1개로 낮추는 것만으로는 이 답이 요청에 들어가지 않는다. 5차 답이 제품 경로로 분석되려면 이 링크가 요청에 포함된 뒤여야 한다. 그 전에는 이미 정한 별도 1회 호출 절차를 유지한다. 이 설계는 그 호출을 실행하지 않는다.

재사용: `founderAnswerSource`의 “옮기지 않고 인용” 의미. 저장 위치는 새 테이블이다. 기존 필드를 옛 행에 채워 넣지 않는다.

---

## 5. 자료 유지·제외 정책

체크되지 않은 자료는 요청에 없다. 코드 추천은 문구로만 보여주고 선택값으로 넣지 않는다.

| 자료 | 기본 | 요청에 들어가는 조건 | 새 사업에서의 신분 |
| --- | --- | --- | --- |
| 기존 사업 아이디어 | 제외 | Founder가 유지에 넣었을 때 | 새 아이디어가 아니다. `retained.idea` |
| Founder 답변 | 제외 | 해당 피드백을 유지에 넣었을 때 | Founder가 말한 문장. 검증된 사실 아님 |
| 확인된 사실 | 제외 | 그 문장이 담긴 검토를 유지에 넣었을 때 | 여전히 그 검토가 확인이라고 부른 문장. 새 검증으로 승격하지 않음 |
| 미검증 주장 | 제외 | 유지에 넣어도 `unverifiedClaims` 쪽 | 확인된 사실로 바꾸지 않음 |
| 가설·계획 | 제외 | 유지에 넣으면 가설·계획으로만 | 실행 근거가 되지 않음 |
| 이전 GPT 분석 | 제외 | 비교용으로만, `priorBranchJudgment` | 새 판단으로 복사하지 않음 |
| 시장 조사 `research_plans`, `evidence` | 제외 | 소유 프로젝트의 행을 Founder가 고를 때 | `stored_material`. 상담 엔진은 오늘 이 표를 읽지 않는다 |
| 고객 검증 `voc_entries` | 제외 | 같은 방식 | 접촉·계약·입금·예약이라는 문장이 아니면 확인 사실이 아님 |
| 사업계획서 | 제외 | 이 설계의 자동 입력 아님 | 계획서 A/B 검증은 이 설계 밖 |

`evidence.confidence`는 요청에 넣지 않는다. HIGH/MEDIUM이 검증 점수처럼 보이기 때문이다.

제외는 삭제가 아니다. 선택하지 않은 자료의 본문은 이번 GPT 요청에 넣지 않는다. 원본 피드백, 검토, 조사 행은 그대로 둔다. 피벗 행에는 이번에 보내지 않은 refId만 남긴다. 나중에 다시 고르면 새 피벗 사건을 넣고, 이전 사건은 바꾸지 않는다. 같은 refId를 유지와 제외에 동시에 두면 확정하지 않고 GPT를 호출하지 않는다. 13.3절이 이 문단보다 우선한다.

스냅샷 원칙: 링크와 피벗 행에 담는 문장은 확정 시각에 읽은 값이다. 이후 원본이 바뀌지 않는다는 전제와 같다. 원본을 고치는 기능은 만들지 않는다.

재사용: 없음. 선택 집합은 새 구조다. 읽기 전용으로 `ai_pm_feedback`, `record_json.sections`, `record_json.rawContent`를 인용한다.

---

## 6. GPT 입력 데이터 계약

피벗 1차는 새 함수 `buildPivotFirstReviewRequest`다. `buildFirstReviewRequest`의 모델, temperature 0.2, maxTokens 2400, 한 번 호출을 따른다. 사용자 본문은 원문 한 줄이 아니라 아래 JSON이다.

호출은 `OpenAIProviderAdapter` 한 번이다. `openReviewChat`의 쿼터 전환을 쓰지 않는다. 한 함수 호출 안에 두 번째 공급자가 들어가면 1회 원칙이 깨진다.

```json
{
  "pivot": {
    "pivotEventId": "",
    "founderPivotType": "partial | direction | full",
    "reason": "",
    "previousDirection": "",
    "newDirection": ""
  },
  "newBusinessIdea": "",
  "retained": [
    {
      "refType": "feedback | review_section | artifact",
      "refId": "",
      "field": "",
      "excerpt": "",
      "trust": "founder_statement | model_hypothesis | stored_material"
    }
  ],
  "answeredPairs": [
    {
      "question": { "reviewId": "", "questionId": "", "text": "" },
      "answer": {
        "feedbackId": "",
        "choiceId": "",
        "choiceLabel": "",
        "supplement": "",
        "provenance": "founder | simulation",
        "sourceStatus": "not_a_verified_fact"
      },
      "notThisQuestion": {
        "reviewId": "",
        "questionId": "",
        "text": "",
        "relation": "different_question | same_question"
      }
    }
  ],
  "priorBranchJudgment": "",
  "notes": ""
}
```

`priorBranchJudgment`는 이전 분기의 판단 문장이다. 출력의 `judgment`로 복사하는 키가 아니고, 유지 자료도 아니다. 제외한 답변과 조사 본문은 이 JSON에 없다. `answeredPairs`에서 `relation`이 `different_question`이면 답은 `question` 쪽에만 둔다. `notThisQuestion`에는 답을 붙이지 않는다. 요청을 만들 때 이 위치가 어긋나면 호출하지 않는다.

넣지 않는 것:

- 선택되지 않은 형제 분기의 단계 전체
- 옛 `stageAnswers` 자동 전개
- `founderAnswerKinds` 정규식 결과. 양조장 문장에 묶여 있다
- `nextFactToAsk`가 정한 다음 목적
- 점수, 가중치, 코드가 고른 다음 질문

단계가 이어질 때의 입력은 기존 `buildProductReanalysisRequest`의 단계 형태를 쓴다. 뿌리 원문은 그 분기의 `parent_review_id = null` 행이다. 계보 답은 `answeredPairs`로만 더한다. 옛 사업 체인을 부모로 걷지 않는다.

요청 전문은 새 테이블 `consulting_model_calls.request_json`에 호출 전에 확정된 메시지를 넣는다. 응답이 실패해도 그 행은 남는다. 과거 1차·3차 요청은 재구성하지 않는다. 없는 요청은 없는 것이다. 4차만 기존 증거 파일이 전문을 갖고 있다.

재사용: 모델 이름, temperature, maxTokens, `renameEchoKeys`의 목적, 단계 경로의 1회·수리 금지. 피벗 1차의 사용자 JSON과 호출 래퍼는 새 코드다.

---

## 7. GPT 출력 데이터 계약

피벗 1차와 이후 단계는 출력 책임만 다르다. 둘 다 질문 1개 이상을 요구한다. 형식 오류는 `failed`와 `rawContent`이고 재호출은 없다.

### 공통 `businessProfile`

프로필의 기준 저장은 분기별 버전 행이다. 13.2절이 이 절의 필드 복사보다 우선한다. 코드는 빈 칸을 다른 분기나 이전 버전 문장으로 채우지 않는다. 필수 키가 없으면 그 버전을 성공으로 넣지 않는다. 이전 버전 행은 그대로 둔다.

현재 화면 라벨과 맞는 키만, 새 검토 행의 기존 필드에 모델이 직접 쓴 문장으로 남길 수 있다. 코드가 다른 키의 문장을 그 칸으로 옮기지 않는다.

| 프로필 키 | 화면이 읽는 칸 | 화면 라벨 | 코드가 옮겨 써도 되는가 |
| --- | --- | --- | --- |
| `customer` | `sections.customer` | 핵심 고객 | 새 행에 한해, 모델이 그 칸에 쓴 경우 |
| `problem` | `sections.problem` | 해결하려는 문제 | 같다 |
| `value` | `analysis.value` | 제공 가치 | 같다 |
| `revenueModel` | `sections.revenueModel` | 수익 구조 | 같다 |
| `competition` | `analysis.competition` | 경쟁 | 같다 |
| `judgment` | `analysis.judgmentDetail` | 예비 사업성 판단 | 같다. 옛 행의 판단 칸은 바꾸지 않는다 |
| `offer` | `sections.execution` | 분석이 없을 때 사업 아이디어 | 옮기지 않는다. 상품 의미와 다르다 |
| `supply` | `analysis.operatingModel` | 운영 방식 | 옮기지 않는다 |
| `operations` | `analysis.operations` | 실행 가능성 | 옮기지 않는다 |
| `verifiedFacts` | `analysis.founderFacts` | 입력에서 읽은 사실 | 옮기지 않는다 |
| `unverifiedClaims` | `analysis.inferences` | 추론 | 옮기지 않는다 |

라벨이 다른 키는 프로필 버전에만 둔다. 지금 패널은 그 키를 그리지 않는다. 패널을 고치는 일은 이 문서의 구현 승인과 별도다.

확인 사실은 접촉, 계약, 입금, 예약처럼 별도 근거가 있는 문장만이다. 유지 목록의 Founder 문장을 `verifiedFacts`로 옮기는 일은 모델의 출력 위반이다. 코드는 그 목록을 사실로 재분류하지 않는다. 품질 판단은 CPO가 원문으로 한다.

### 피벗 1차만 추가하는 키

| 키 | 규칙 |
| --- | --- |
| `inheritedJudgment` | 반드시 false. true 이거나 없으면 형식 실패 |
| `assessedPivotScope` | `partial`, `direction`, `full` 중 모델이 본 폭. Founder 유형을 대체하지 않는다 |
| `changedFromPrevious` | 옛 사업과 달라진 핵심 |
| `reuseAssessment` | 유지 목록의 refId마다 재사용 가능 여부. 새 refId를 만들지 않는다 |
| `recheck` | 새 사업에서 다시 볼 사항 |
| `pivotComparison` | 8절 아래가 아니라 이 표의 비교 객체 |

`pivotComparison`:

| 키 | 내용 |
| --- | --- |
| `previousDirection` | 모델이 읽은 변경 전 방향 |
| `newDirection` | 변경 후 방향 |
| `retainedElements` | 유지된 요소 |
| `changedElements` | 바뀐 요소 |
| `removedHypotheses` | 빠진 가설. 검증된 사실로 바꾸지 않는다 |
| `newHypotheses` | 새 가설 |
| `reusableEvidence` | 유지 목록 중 아직 쓸 수 있는 자료의 refId |
| `newVerification` | 새로 필요한 검증 |

비교 문장은 모델이 쓴다. 코드가 고객·수익 칸을 채워 비교표를 만들지 않는다. 키가 없으면 형식 실패다. 각 비교 항목은 `sourceKind`와 `sourceRef`를 가진다. `sourceKind`가 `model_inference`가 아닌데 `sourceRef`가 없으면 형식 실패다. `removedHypotheses`의 문장이 `verifiedFacts`에 있으면 형식 실패다. 재호출은 없다. 이 검사는 문장 위치가 계약과 맞는지 보고, 사업 비교가 참인지는 판단하지 않는다.

### 다음 질문

`questions`는 1개 이상이다. 각 질문은 `text`와 서로 다른 `choices` 2개 이상이다. `nextQuestion`은 첫 질문과 같다. 질문 0개는 실패다. 이미 답한 문장과 같은 질문은 기존 `stage_questions_repeated`로 실패다.

선택지 id는 순서대로 `c1`, `c2`다. `기타`와 `직접 입력`은 같은 id `other`를 쓰지 않는다. 지금 `choicesFromLabels`가 둘을 모두 `other`로 만든다. Phase 3에서 그 함수를 고친다. 설계 판단이지 이번 코드 수정이 아니다.

재사용: `judgeStageContract`의 실패 시 원문 보존, `ReviewSections` / `BusinessAnalysis` 필드. 빈 문자열로 덮는 매핑은 새 계약에서 버린다. 옛 행을 다시 매핑하지 않는다.

---

## 8. 질문 1개 및 N개 처리

현재 `acceptedStageQuestions`는 `analysis.questions.length >= 2`다. 최초 분석도 같은 함수로 질문 2개 미만을 실패시킨다. 화면 `submitReanalysis`는 2개 미만이면 요청을 보내지 않는다. 5차 질문 행 `e3d42c90`은 `round5-q1` 하나라 이 경로에 들어가지 못한다.

바꿀 규칙:

| 조건 | 결과 |
| --- | --- |
| `analysis.questions`가 1개 이상이고 id와 문장이 비어 있지 않으며 서로 다름 | 단계로 인정 |
| 그 질문 전부에 답 있음 | 통합 호출 1회 |
| 일부만 답함 | `pending`, 호출 0 |
| 같은 부모, 같은 답 해시, 같은 부분 여부 | 기존 자식 재사용 |
| `analysis.questions`가 없거나 0개 | 단계가 아님. `nextQuestion` 한 줄만 있는 옛 행은 여기 남는다 |

`consultingQuestions`가 `nextQuestion`으로 만드는 가상 `q1`은 단계 인정에 쓰지 않는다. 옛 한 줄 질문을 갑자기 단계로 열지 않기 위해서다. 5차 행은 배열에 질문이 하나 있으므로 규칙 변경 후 단계가 된다.

그 행이 단계가 되어도 답이 없으면 호출하지 않는다. 배포나 테스트가 이 행으로 GPT를 호출하면 안 된다. Preview의 4차 라이브 테스트에 5차·피벗 호출을 추가하지 않는다.

질문 1개인 단계의 완료 조건은 그 1개의 답이다. N개면 N개다. `allowPartial`은 화면이 계속 보내지 않는다.

1개 단계를 연 뒤의 다음 출력도 1개 이상이면 된다. “다음 단계도 2개 이상”을 코드가 강제하지 않는다.

재사용: `submitConsultingStage`의 저장 후 완료 검사, `stageSupplementKey` 재사용, `pending` 응답. 바꾸는 조건은 `length < 2` 한 곳과 화면의 같은 가드, 최초 분석의 `missingStage`, `judgeStageContract`의 `texts.length < 2`다. 이번 단계에서는 바꾸지 않는다.

---

## 9. 피벗 UI/UX 사용자 흐름

새 메뉴를 만들지 않는다. 지금 상담 화면 안에서 처리한다. 구현은 Phase 3이며 이번 문서의 승인과 별도로 NOT APPROVED다.

1. 현재 방향. 초점 분기의 최신 성공 검토에서 `businessProfile.idea`가 있으면 그 문장, 없으면 그 분기의 `inputText`.
2. 현재 단계. 초점 분기의 멤버 중 질문 보유 행과 마지막 분석 행을 구분해 보여 준다. `e3d42c90`처럼 `callCount` 0이고 질문만 있는 행은 “질문 보관”으로 표시하고, 분석을 마친 단계로 보이지 않게 한다.
3. “사업 방향 전환”은 초안을 연다. 서버 기록이 없다.
4. 유형 세 가지 중 하나.
5. 이유, 새 방향, 유지할 요소, 빼거나 폐기할 요소, 재사용할 자료, 기타 설명.
6. 유지 후보는 현재 분기의 피드백, 검토 섹션, 소유 프로젝트의 조사 행 목록이다. 체크 전이다.
7. 비교 미리보기는 확정 전에도 코드가 표를 채우지 않는다. 고른 유지·제외 목록만 보여 준다. 판단 비교는 호출이 성공한 뒤 모델의 `pivotComparison`이다.
8. 확정 문구는 “새 분기의 1차 분석을 시작한다. 지금 상담은 남는다.”이다.
9. 취소는 초안만 버린다.
10. 확정 후 그 사용자를 새 분기로 여는 초점 행을 넣는다. “이전 사업으로 돌아가기”는 옛 `branch_id`로 초점 행을 하나 더 넣는다. 다른 분기의 검토, 답, 프로필, 진행 중 질문은 바꾸지 않는다. 다시 열 위치는 13.4절의 읽기 규칙이다.
11. 실패 화면은 새 분기에 실패 행과 원문 응답을 보여 준다. 자동 재호출 버튼은 두지 않는다. 이전 분기로 돌아가는 동작은 남겨 둔다.

분기 표시는 방향 문장과 `부분 변경`, `방향 변경`, `새 사업`이다. 같은 원문 텍스트의 마지막 검토를 집는 현재 `matchReview`는 이 흐름에서 쓰지 않는다.

재사용: 상담 패널, 답 저장 0회, `pending` 문구의 의미. 피벗 초안과 분기 전환은 새 UI다.

---

## 10. 기존 상담 회귀 위험

| 위험 | 막는 방법 |
| --- | --- |
| 질문 1개 허용이 5차 행을 즉시 분석함 | 답이 없을 때 호출하지 않는다. 라이브 테스트를 추가하지 않는다 |
| 질문 1개 허용이 `nextQuestion`만 있는 옛 행을 단계로 염 | 단계 인정은 `analysis.questions` 배열만 본다 |
| 피벗 자식을 옛 검토의 `parent_review_id`에 붙이면 뿌리 원문이 옛 아이디어가 됨 | 새 1차의 부모는 null. 연결은 피벗 사건이다 |
| `runFirstReview` sha 재사용이 옛 성공 행을 반환 | 피벗 1차는 그 함수를 호출하지 않는다. 재사용 키는 `pivot input_sha` |
| 단계 매핑이 사업 필드를 계속 비움 | 새 계약의 성공 행만 프로필을 채운다. 옛 행은 재저장하지 않는다 |
| 코드가 빈 필드를 부모 문장으로 채움 | 병합하지 않는다. 키 누락은 실패다 |
| 유지 목록이 곧 검증 사실이 됨 | 출력 계약이 신분을 유지. 코드는 재분류하지 않는다 |
| 제외 자료를 빼면 모델이 옛 판단을 사실로 기억 | 제외 목록을 별도 키로 전달한다 |
| 양조장 정규식이 다른 업종 답을 `fact`로 붙임 | 피벗 요청과 새 단계 요청에 `founderAnswerKinds`를 넣지 않는다 |
| 쿼터 전환이 두 번째 공급자 호출을 만듦 | 피벗 호출은 어댑터 직접 1회 |
| `기타`와 `직접 입력`이 같은 id | 새 선택지 id 규칙. 옛 행의 id는 고치지 않는다 |
| 최신 검토 선택이 다른 분기를 염 | 초점 분기 멤버만 표시 |
| 계보 수리로 `3be5715e`나 `finished_at`을 수정 | 링크 테이블만 INSERT |
| 비단계 `finishCall` 수리 횟수가 단계 경로로 번짐 | 단계와 피벗은 `stageContract`처럼 첫 응답만 저장하는 분기를 탄다 |
| 프로젝트 하드 삭제 캐스케이드 | 새 테이블도 `user_id`와 프로젝트 삭제 정책을 따른다. 상담 중 삭제 API는 만들지 않는다 |
| 실험 계보 d/e/f가 분기 A에 섞임 | A의 멤버는 2절의 여섯 행만. 다른 실험 행은 멤버로 넣지 않는다 |

기존 2개 질문 단계의 일부 저장 0회, 완료 1회, 중복 재사용은 테스트로 유지한다. 동작 변경은 “1개도 단계”와 “새 행의 프로필 매핑”과 “분기 초점”뿐이다.

---

## 11. DB 마이그레이션 계획

이번 Phase에서는 실행하지 않는다. 적용은 설계 승인 뒤의 Phase 3다.

추가만 한다.

- `consulting_branches`
- `consulting_branch_members`
- `consulting_pivot_events`
- `consulting_lineage_links`
- `consulting_branch_focus`
- `consulting_model_calls`
- `consulting_business_profiles`

하지 않는 것:

- `ai_pm_reviews`, `ai_pm_feedback`의 UPDATE와 DELETE
- 기존 행에 `branch_id` 컬럼을 채워 넣는 작업. 컬럼 자체를 추가하지 않는다. 소속은 멤버 행이다
- 과거 요청 전문의 역삽입
- `finished_at` 변경
- 023 주석의 오래된 “미적용” 문장을 근거로 테이블을 다시 만들지 않는다. 증거상 검토 행은 이미 있다. 라이브 스키마 재확인은 아직 NOT RUN이다

각 새 테이블은 `user_id`가 `auth.users`를 참조한다. 서비스 롤만 쓰고 anon 정책은 만들지 않는다. 기본 키 충돌은 기존 저장소와 같이 `wrote: false`다.

롤백은 새 테이블을 역순으로 DROP 한다. 기존 검토 테이블은 DROP 하지 않는다.

`consulting_model_calls` 컬럼은 `call_id`, `user_id`, `review_id`, `branch_id`, `request_json`, `response_text`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `call_index`, `created_at`다. `call_index`는 1만 허용하는 제약으로 수리 호출 자리를 만들지 않는다. 피벗과 단계 경로에 한정한다. 옛 비단계 수리 경로는 이 표에 쓰지 않고, 그 경로 자체를 피벗이 호출하지 않는다.

재사용: `SupabaseAiPmReviewRepository`의 insert-only와 23505 처리. 새 저장소는 `packages/db`에 둔다.

---

## 12. 구현 단계 및 테스트 계획

구현은 이 문서에 대한 CPO 판정이 PASS인 뒤에만 시작한다. 아래 순서는 계획이다. 상태는 모두 NOT APPROVED다.

1. 단위 테스트부터 추가한다. 채팅은 주입하고 `evidence`는 `injected_http`다. 라이브 키를 쓰지 않는다.
2. 새 테이블 마이그레이션 파일을 추가하고, 승인된 환경에서만 적용한다. Production은 별도 CEO 승인 전까지 잠금이다.
3. 양조장 계보 링크를 INSERT 한다. 원본 여섯 검토와 피드백의 `finished_at`이 같은지 읽어서 확인하고, 다르면 링크 삽입을 멈춘다.
4. 질문 개수 조건을 1개 이상으로 바꾼다. 화면 가드도 같이 바꾼다.
5. 분기별 프로필 버전을 새 행으로만 넣는다. 라벨이 다른 칸으로 복사하지 않는다. 13.2절.
6. 새 호출의 요청·응답을 `consulting_model_calls`에 남긴다.
7. 피벗 확정, 새 분기, 부모 null인 1차, 초점 이동, 이전 분기 복귀를 연결한다.
8. 그 다음에야 피벗 유형별 주입 테스트와, 승인된 경우에만 실제 GPT 1회를 증거로 남긴다. 품질 PASS는 CTO가 선언하지 않는다.

테스트:

| 테스트 | 기대 | 호출 |
| --- | --- | --- |
| 기존 질문 2개, 일부 답 | `pending` | 0 |
| 기존 질문 2개, 전부 답 | 통합 1회 또는 같은 해시 재사용 | 1 또는 0 |
| 질문 1개, 답 없음 | 호출 없음. `e3d42c90` 포함 | 0 |
| 질문 1개, 답 있음 | 통합 1회. 다만 계보 링크가 요청에 없으면 이 제품 경로로 5차를 돌리지 않음 | 설계상 1. 이번엔 NOT RUN |
| `nextQuestion`만 있는 옛 행 | 단계 거절 유지 | 0 |
| 피벗 취소 | 서버 행 없음 | 0 |
| 부분·방향·전면 | 각각 새 분기, 부모 null, 1차 | 주입 또는 승인된 1회 |
| 유지하지 않은 판단 | 요청의 `retained`에 없음 | 0 |
| 미검증 문장 | 출력 계약상 사실 배열로 코드가 옮기지 않음 | 해당 호출 |
| 같은 확정 두 번 | 같은 `pivot_event_id` | 두 번째는 0 |
| 형식 오류 | `failed`, raw 보존, 재호출 없음 | 1 |
| 이전 분기 복귀 | 새 focus 행. 옛 검토 불변 | 0 |
| 원본 수정 감시 | `finished_at`과 피드백 본문 불변 | 0 |
| 계보 증명 | `7d2d04e5`는 `3be5715e` 질문에만 붙고, `0a13c604` 질문과는 `different_question` | 0 |
| 쌍 위치 | 답이 `notThisQuestion`에 붙으면 요청 빌더가 호출을 거절 | 0 |
| 프로필 독립 | B 버전 삽입 후 A 프로필 행의 본문이 같음. 빠진 키를 A에서 채우지 않음 | 0 |
| 제외와 보존 | 보내지 않은 피드백 행이 남아 있고, 다음 사건이 그 refId를 다시 고를 수 있음 | 0 |
| 복귀 | A로 도는 초점 행 추가 후 B의 멤버·검토·답·프로필이 같음 | 0 |
| 피벗은 실패가 아님 | 원본 분기의 `status`가 피벗 삽입 뒤에도 같음 | 0 |

실제 GPT를 쓰는 테스트는 SIMULATION 또는 실제 Founder 답을 증거에 구분한다. 호출 성공만으로 품질 PASS를 적지 않는다.

5차 Founder 답이 이 설계 검토 중에 저장되면, 그 분석은 이 구현과 섞지 않는다. 이미 잠긴 절차대로 새 행 하나, 부모 `e3d42c90`, 호출 1회, 원문 제출이다. 그 답이 지금 있는지는 이 턴에 조회하지 않았다.

---

## 13. Phase 2.1 보완

2026-10-31 23:53 KST 조건부 PASS에서 요구한 네 가지다. 구현은 여전히 NOT APPROVED다. 이 절을 쓰면서 스키마를 적용하거나 기존 행을 수정하지 않았다.

피벗은 기존 상담을 실패로 두는 기능이 아니다. Founder가 방향을 바꾸는 결정이다. 옛 사업성 평가를 새 사업의 판단으로 넣지 않고, 새 사업을 옛 단계의 다음 번호로 붙이지 않는다.

### 13.1 답변 계보의 출처 증명

링크 한 행이 다음을 모두 가진다.

| 필드 | 증명하는 것 |
| --- | --- |
| `feedback_id` | 답 원본. 예: `7d2d04e5` |
| `answered_question_id` | 그 답이 실제로 향한 질문 ID |
| `answered_question_review_id` | 그 질문이 들어 있는 검토. 예: `3be5715e` |
| `answered_question_text` | 그 질문 문장. 링크에만 적고 원본 검토는 고치지 않는다 |
| `choice_id`, `choice_label`, `supplement` | 피드백과 같은 답. 다르면 링크를 넣지 않는다 |
| `compared_question_id` | 성공 체인에서 비교한 질문 ID |
| `compared_question_review_id` | 그 질문이 들어 있는 검토. 예: `0a13c604` |
| `compared_question_text` | 비교 질문 문장 |
| `question_relation` | `same_question` 또는 `different_question` |
| `citing_review_id` | 이 답을 입력으로 읽은 분석. 인용이 아니면 null |
| `citation_reason` | 왜 이 링크가 있는지 |
| `source_status` | `founder_answer`, `simulation`, `not_a_verified_fact`, `request_unavailable` |

`3be5715e`의 질문은 `sections.nextQuestion`이 비어 있고 원문은 `rawContent`에 있다. 그 검토에 질문 ID를 새로 써 넣지 않는다. 링크의 `answered_question_id`는 `source:3be5715e:raw-next-question`처럼 링크 안에서만 쓰는 ID다. 비교 질문 ID는 `source:0a13c604:next-question`이다. 관계 값은 `different_question`이다. 1차 성공 행의 질문은 파트너십 구축 계획이고, 답변 행의 질문은 협력 가능성이다.

인용 링크는 분석마다 따로 넣는다.

- `cbf201a2`는 4차 증거 요청이 이 피드백을 읽었다. `citation_reason`은 그 증거 파일을 가리킨다. `source_status`는 `not_a_verified_fact`다. 4차 답 자체는 시뮬레이션이지만, 이 피드백은 Founder 답이다.
- `970b8ce1`은 그 행의 `founderAnswerSource`가 이 피드백을 가리킬 때만 인용 링크를 만든다. 요청 전문이 없고 그 필드도 없으면 `request_unavailable`이며, 읽었다고 단정하는 링크는 만들지 않는다.

GPT에는 질문과 답을 한 쌍으로 보낸다.

```json
{
  "question": { "reviewId": "3be5715e", "questionId": "source:3be5715e:raw-next-question", "text": "양조장과의 협력 가능성은 어떻게 되는가?" },
  "answer": { "feedbackId": "7d2d04e5", "choiceId": "c1", "choiceLabel": "양조장과의 협력 가능성이 높다.", "supplement": "양조장과의 협력 가능성이 높다." },
  "notThisQuestion": {
    "reviewId": "0a13c604",
    "questionId": "source:0a13c604:next-question",
    "text": "어떤 방식으로 양조장과의 파트너십을 구축할 계획인가?",
    "relation": "different_question"
  }
}
```

`notThisQuestion` 안에 `answer`를 두지 않는다. 요청 빌더는 `different_question`인데 답의 `feedbackId`가 비교 질문 ID 아래에 있으면 호출 전에 거절한다. 모델에게 “이 답을 비교 질문의 답으로 해석하지 않는다”는 문장을 시스템 쪽에 둔다. 코드는 두 질문을 하나의 상담 턴으로 합치지 않는다.

재사용: `founderAnswerSource`의 인용 의미. 증명 필드는 새 링크 행이다.

### 13.2 분기별 사업 프로필 독립성

화면 `ai-pm-review-panel.tsx`의 세부 분석은 칸마다 고정 라벨을 쓴다. 핵심 고객, 해결하려는 문제, 제공 가치, 수익 구조, 경쟁은 프로필의 같은 말과 맞다. 실행 가능성, 운영 방식, 입력에서 읽은 사실, 추론은 이름이 비슷해도 상품, 공급, 확인 사실, 미검증 주장과 같지 않다. 분석이 없는 화면은 `sections.execution`을 사업 아이디어로 보여 준다. 질문 폼은 `analysis.questions.length >= 2`일 때만 열린다. 질문 1개 단계의 화면 표시는 그 가드를 바꾸는 일이며 이번 보완에서 코드를 바꾸지 않는다.

프로필은 `consulting_business_profiles`의 새 버전 행이다.

| 필드 | 의미 |
| --- | --- |
| `profile_id` | 버전 |
| `branch_id`, `user_id`, `project_id` | 어느 분기의 사업인가 |
| `review_id` | 이 버전을 쓴 분석. 다른 분기의 검토가 될 수 없다 |
| `version` | 그 분기 안에서의 순번. 삽입 때 정하고 이후 바꾸지 않는다 |
| `previous_profile_id` | 같은 분기의 직전 버전. 다른 분기 프로필을 가리키지 않는다 |
| `profile_json` | idea, customer, problem, value, offer, revenueModel, market, operations, supply, competition, verification, judgment, plans |
| `created_at` | 삽입 시각 |

사업 A의 마지막 프로필과 사업 B의 첫 프로필은 다른 행이다. B의 `previous_profile_id`는 null이다. B를 만들어도 A의 `profile_json`은 갱신하지 않는다. 새 버전에 필수 키가 없으면 성공 버전으로 넣지 않고, A나 직전 버전의 문장으로 빈 칸을 채우지 않는다. 실패해도 직전 버전은 남는다.

새 검토의 `ReviewSections`는 그 검토의 행에만 있다. 옛 검토 행의 섹션을 새 문장으로 덮지 않는다. 라벨이 다른 값은 프로필에만 둔다. 지금 패널은 그 값을 그리지 않는다. 그 공백을 메우려고 `founderFacts`나 `operations`에 넣지 않는다.

재사용: 라벨이 같은 칸의 의미. 독립 버전 테이블은 새것이다.

### 13.3 자료 재사용 및 제외

세 층을 나눈다.

| 층 | 저장 | 이번 GPT 요청 |
| --- | --- | --- |
| 원본 | `ai_pm_reviews`, `ai_pm_feedback`, 조사 표. 삭제하지 않는다 | 자동으로 넣지 않는다 |
| 이번에 재사용 | 피벗 사건의 `retained` refId와 본문 스냅샷 | `retained`와, 계보가 있으면 `answeredPairs` |
| 이번에 제외 | 피벗 사건의 `not_sent_ref_ids`. 본문은 복사하지 않는다 | 본문을 넣지 않는다 |

`not_sent_ref_ids`는 “이 확정에서 보내지 않음”이다. 자료를 앞으로 못 쓰게 만드는 표시가 아니다. 선택 화면은 항상 원본 표를 읽는다. Founder가 나중에 그 refId를 고르면 새 피벗 사건 또는 새 분석 요청을 만든다. 이전 사건의 `retained`와 `not_sent_ref_ids`는 수정하지 않는다.

`priorBranchJudgment`만 비교를 위해 이전 판단 문장으로 보낼 수 있다. 그것은 유지 자료 목록이 아니고, 확인 사실이 아니다. 제외한 피드백 본문을 이 문장 대신 붙이지 않는다.

비교 결과의 각 항목은 요청에 있던 refId나 `priorBranchJudgment`를 `sourceRef`로 가리킨다. 모델이 새로 추론한 문장만 `sourceKind: model_inference`와 빈 `sourceRef`를 허용한다. 빠진 가설을 확인 사실 배열에 다시 넣으면 형식 실패로 저장하고 재호출하지 않는다. 사실로 맞는지의 품질 판정은 원문을 본 CPO가 한다.

재사용: 원본 테이블의 읽기. 선택 집합과 비교의 출처 키는 새 계약이다.

### 13.4 활성 분기 및 복귀 상태

초점 행은 선택 사건이다. 사업 분기, 마지막 분석, 진행 중 단계를 대체하지 않는다.

| 상태 | 정하는 방법 | 범위 | 복귀 때 쓰는 방식 |
| --- | --- | --- | --- |
| 지금 선택한 분기 | 그 사용자의 최신 `consulting_branch_focus` | `user_id` + `project_id` | 새 초점 행의 `branch_id` |
| 그 분기의 마지막 성공 분석 | 멤버 중 `succeeded`이고 `callCount >= 1`이며 섹션이 있는 검토의 최신 행 | 그 `branch_id` | 진행 중 단계가 없을 때 연다 |
| 진행 중 단계 | 그 분기의 질문 보유 행 중, 생성된 질문 전부에 답이 없는 행 | 그 `branch_id` | 있으면 여기를 연다. `e3d42c90`은 호출 0인 질문 보유다 |
| 복귀 위치 | 위 둘을 읽는 규칙. 별도 컬럼으로 저장하지 않는다 | 선택과 같은 사용자·프로젝트 | 쓸 때 다른 분기를 UPDATE 하지 않는다 |

분기 데이터는 프로젝트에 남는다. 초점은 사용자마다 다르다. 한 사용자가 A로 돌아와도 다른 사용자의 최신 초점은 바뀌지 않는다. 워크스페이스 소유가 한 명이어도 키는 `user_id`와 `project_id`다. 프로젝트 전역에 “현재 분기” 컬럼을 만들어 덮어쓰지 않는다.

A에서 B로 피벗한 뒤 A로 돌아오면 B의 멤버, 검토, 피드백, 프로필 버전, 진행 중 질문이 그대로다. A의 질문 보유 행에 답이 없으면 그 질문을 다시 연다. 답이 이미 있고 분석이 끝나 있으면 마지막 성공 분석을 연다. 어느 쪽이든 B에 행을 쓰지 않는다.

지금 `matchReview`는 같은 원문 텍스트의 마지막 `ready` 검토를 연다. 복귀 구현 전에는 그 함수를 그대로 둔다. 승인된 구현은 선택한 분기의 멤버만 연다.

재사용: 검토와 피드백을 읽어 진행 중 여부를 계산하는 방식. 초점 테이블은 선택 사건으로만 쓴다.

### 13.5 네 항목의 무결성 테스트

구현 승인 뒤에 주입 채팅으로 돌린다. 이번 보완에서는 실행하지 않는다. 기대는 12절 표의 마지막 여섯 행과 같다.

1. 링크 삽입 전후의 `finished_at`, 피드백 본문, `3be5715e.sections.nextQuestion`이 같다. 링크는 답 원본, 실제 질문, 원본 검토, 인용 분석, `different_question`, 출처 상태를 한 행에 가진다.
2. 요청 JSON에서 그 답은 `3be5715e` 질문의 `answer`에만 있다. `0a13c604` 질문 객체에는 그 `feedbackId`가 없다.
3. B 프로필을 넣은 뒤 A 프로필 행의 `profile_json`과 `review_id`가 같다. B의 `previous_profile_id`는 null이다. 필수 키를 뺀 출력은 B의 성공 버전이 되지 않고 A의 고객 문장을 복사하지 않는다.
4. 제외한 피드백의 행 수가 줄지 않는다. 다음 선택 목록에 그 refId가 다시 나타난다. 첫 피벗 사건의 `not_sent_ref_ids`는 두 번째 사건 이후에도 같다.
5. A로 복귀한 뒤 B의 멤버 수, 검토 `status`, 피드백 수, 프로필 버전이 같다. A의 복귀 위치는 미답 질문이 있으면 그 질문 행이고, 아니면 마지막 성공 분석이다.
6. 피벗 사건 삽입 뒤 원본 분기의 검토 `status`는 `failed`로 바뀌지 않는다.

---

## 재사용 요약

| 설계 항목 | 재사용 | 새로 둠 |
| --- | --- | --- |
| 검토·피드백 삽입 | `insertReview`, `insertFeedback` | 분기, 피벗, 링크, 초점, 호출 원문 테이블 |
| 단계 체인 | 분기 내부의 `parent_review_id` | 피벗 1차의 부모는 null |
| 답 저장 0회, 완료 1회, 중복 재사용 | `submitConsultingStage` | 인정 개수를 1개 이상으로 |
| 실패 원문 보존 | 단계 `finishCall` | 피벗 1차도 같은 방식. 수리 없음 |
| 계보 인용 | `founderAnswerSource`의 의미 | 13.1의 증명 필드. 불일치 질문에 답을 붙이지 않음 |
| 사업 필드 | 라벨이 같은 칸의 의미 | 분기별 프로필 버전. 다른 분기 덮어쓰기 없음. 13.2절 |
| 최초 호출 형태 | 모델과 토큰 한도 | `buildPivotFirstReviewRequest`. `runFirstReview` 재사용 안 함 |
| 화면 | 기존 상담 패널 | 초안, 확정, 분기 전환 |
| 과거 요청 | 4차 증거 파일만 전문 | 이후 호출부터 `consulting_model_calls` |
