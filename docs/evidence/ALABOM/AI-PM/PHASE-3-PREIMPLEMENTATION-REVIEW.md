# Phase 3 사전 무결성 검증

2026-11-01 00:20 KST 이후 읽기. 구현은 하지 않았다.

하지 않은 일: 스키마 적용, 마이그레이션 실행, 기존 행의 INSERT / UPDATE / DELETE, 상담 로직 변경, UI 구현, GPT 호출, Production 배포.

읽기는 `ai_pm_reviews`와 `ai_pm_feedback`의 식별자와 시각만 가져왔다. 소유자 식별자는 기록하지 않았다.

기준 계획: `docs/evidence/ALABOM/AI-PM/PHASE-3-START-PLAN.md`.  
기준 설계: `docs/evidence/ALABOM/AI-PM/PIVOT-ARCHITECTURE-DESIGN.md` 13절.

## 총괄

| 항목 | 상태 |
| --- | --- |
| 작업 범위 | 분기 소유, 제약 명세, 여섯 검토와 피드백의 읽기 매핑, 롤백 방법, 복귀 시나리오 |
| 변경 파일 | 이 문서, `docs/TASKS.md` 상태 한 줄 |
| 변경 DB 구조 | NOT RUN |
| 기존 기능 영향 | 없음. 읽기만 했다 |
| 테스트 결과 | 자동화 테스트 NOT RUN. 아래 읽기 대조만 수행 |
| GPT 실제 호출 여부 | NOT RUN |
| 실제/시뮬레이션 구분 | 새 답을 만들지 않음. 4차 시뮬레이션 표시는 기존 증거 그대로 |
| 미해결 문제 | DB 제약 SQL이 저장소에 없고 적용되지 않음. 동시 쓰기 검증 NOT RUN |
| 잔여 작업 | Phase 3 구현은 요청하지 않음. Production 잠금 |
| Phase 3 구현 승인 요청 | 하지 않음 |

---

## 1. 데이터 소유권 구조

`user_id`와 `project_id`는 워크스페이스다. 이번 읽기에서 여섯 검토의 `project_id`는 모두 `3a5fc4a0-2e90-45e6-8370-350beda67342`였다.

`parent_review_id`는 단계의 앞뒤다. 분기 이름이 아니다. 부모 null이 두 개다. `0a13c604`와 `3be5715e`다. 같은 프로젝트의 최신 성공 행을 그대로 쓰면 질문 보유 `e3d42c90`이 먼저 나온다.

소유는 멤버 행의 `branch_id`다.

| 자료 | 소속 |
| --- | --- |
| 검토 | 멤버 행 하나. `review_id`는 멤버 표 전체에서 한 번 |
| 답변 | 그 피드백의 `review_id`가 가리키는 멤버의 분기. 피드백 행에 분기를 복사하지 않음 |
| 프로필 | 프로필의 `branch_id`. 참조 `review_id`는 같은 분기의 멤버 |
| 초점 | 사용자와 프로젝트의 최신 초점 행. 소유가 아님 |

분기 A에 넣을 멤버는 2절의 여섯 행뿐이다. 같은 프로젝트의 다른 검토는 68개 중 62개다. 그 62개는 멤버가 아니다. 샘플로 읽은 `183719a3`, `35f1dd3d`, `c9866427`은 같은 프로젝트의 성공 행이고 부모가 여섯 행 밖에 있다.

상태: 소유 규칙 명세 PASS. 멤버 표는 아직 없으므로 데이터베이스 소속 PASS가 아니다. 그 적용은 NOT RUN.

---

## 2. 기존 데이터 매핑표

읽은 시각은 2026-11-01 00:20 KST 이후다. `finished_at`은 저장된 시각을 KST로 옮긴 것이다.

| review 또는 feedback | parent | finished_at 또는 submitted_at (KST) | 상태 | callCount | sections | 예상 분기 | 분류 | 정식 멤버 | 사유 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `0a13c604` | 없음 | 2026-10-28 16:21:46 | succeeded | 1 | 있음 | A | `stage_review` | 예 | 성공 체인의 뿌리. 1차 성공 분석 |
| `3be5715e` | 없음 | 2026-10-29 09:37:28 | failed | 1 | 없음 | A | `failed_source` | 예 | Founder 답의 질문 원문. 성공 단계로 올리지 않음 |
| `9e169fef` | `0a13c604` | 2026-10-31 09:32:17 | succeeded | 1 | 있음 | A | `stage_review` | 예 | 성공 체인의 중간 분석. 부모가 멤버 |
| `970b8ce1` | `9e169fef` | 2026-10-31 10:51:24 | succeeded | 1 | 있음 | A | `stage_review` | 예 | 3차로 다룬 분석. 부모가 멤버 |
| `cbf201a2` | `970b8ce1` | 2026-10-31 21:44:47 | succeeded | 1 | 있음 | A | `stage_review` | 예 | 4차 분석. 증거 `consulting-round4-2026-10-31.json`의 `finishedAt` `2026-10-31T12:44:47.782Z`와 같은 시각 |
| `e3d42c90` | `cbf201a2` | 2026-10-31 22:06:27 | succeeded | 0 | 있음 | A | `question_holder` | 예 | 5차 질문 보관. 증거 `storedAt` `2026-10-31T13:06:27.809Z`와 같은 시각. 분석이 아님 |
| 피드백 `7d2d04e5` | 검토 `3be5715e` | 2026-10-29 09:59:52 | 저장 | 모델 0 | 해당 없음 | A, 검토를 통해 | 답변 | 멤버 행으로 복사하지 않음 | `choiceId`는 `c1`. 분기 A는 질문 행의 멤버 자격으로 따라감 |

부모 사슬 `0a13c604` → `9e169fef` → `970b8ce1` → `cbf201a2` → `e3d42c90`은 4차 증거의 `recordLink`와 같다. `3be5715e`는 그 사슬의 부모가 아니다.

프로젝트 검토 수는 68이다. 5차 질문 증거의 삽입 후 68과 같다. `e3d42c90`의 자식 검토는 0, 그 행의 피드백은 0이다. 실패 행의 피드백은 1건이다.

네 검토 `0a13c604`, `3be5715e`, `9e169fef`, `970b8ce1`의 `finished_at`은 4차·5차 증거 파일에 시각 필드가 없다. 이번 읽기가 그 네 시각의 기준이다. 부모 식별자는 4차 증거와 일치하므로 귀속은 PASS, 그 네 시각의 과거 파일 대조는 NOT RUN이다.

`cbf201a2`와 `e3d42c90`의 시각 대조는 PASS다.

이후 마이그레이션은 이 표와 다시 읽은 값이 하나라도 다르면 CREATE 이후의 멤버 삽입을 멈추고, 이미 만든 새 표만 롤백한다.

상태: 매핑 읽기 PASS. 마이그레이션 적용은 NOT RUN.

---

## 3. branch_id 무결성 규칙

저장소의 마이그레이션 파일에는 이 제약이 없다. 적용도 하지 않았다. 구현 승인이 나기 전에 들어갈 SQL은 아래가 필요하다. 이 문서에 적은 것이며 실행하지 않았다.

```sql
create table consulting_branch_members (
  member_id text primary key,
  branch_id text not null,
  user_id uuid not null,
  review_id text not null,
  role text not null check (role in ('stage_review', 'question_holder', 'failed_source')),
  created_at timestamptz not null,
  unique (review_id)
);
```

`unique (review_id)`가 한 검토의 두 분기 소속을 데이터베이스에서 막는다. `(branch_id, review_id)`만 유일하면 같은 검토가 다른 분기에 다시 들어갈 수 있다. 그 형태는 쓰지 않는다.

단계 순서는 같은 `branch_id`의 멤버만 따라간다. 부모가 null이 아니면 그 부모도 같은 분기의 멤버여야 한다. `ai_pm_reviews`에 `branch_id`가 없으므로 외래 키만으로는 부모 분기를 강제하지 못한다. 멤버를 넣을 때 부모가 이미 같은 분기 멤버이거나 부모가 없는 행만 허용하는 검사다. 삽입 순서는 부모 검토가 먼저다.

이번 여섯 행에 그 검사를 적용하면 다음과 같다.

| 행 | 결과 |
| --- | --- |
| `0a13c604` | 부모 없음. `stage_review` 뿌리로 허용 |
| `3be5715e` | 부모 없음. `failed_source`로 허용. 단계 순서의 뿌리는 아님 |
| `9e169fef`, `970b8ce1`, `cbf201a2` | 부모가 앞선 멤버. 허용 |
| `e3d42c90` | 부모가 `cbf201a2`. 허용. 역할은 `question_holder` |

Preview 행 `183719a3`의 부모 `cd9ccd98`은 여섯 행에 없다. 멤버 삽입 목록에 없으므로 정식 분기에 들어가지 않는다. 상태: 제외 규칙 PASS. 데이터베이스 강제 NOT RUN.

같은 분기 안에서도 부모 null이 둘이다. 단계 순서는 `stage_review`와 그 자식 `question_holder`만 걷는다. `failed_source`를 두 번째 뿌리로 걷지 않는다.

상태: 규칙 명세 PASS. 데이터베이스 제약 존재 FAIL이 아니라 NOT RUN이다. 제약이 빠져 있는 현재 스키마를 구현 완료로 보지 않는다.

---

## 4. 프로필 참조 무결성

프로필 표도 아직 없다. 빈 칸을 다른 분기에서 채우는 코드 경로는 없다. 그것은 기능이 없어서이지, 테스트를 통과해서가 아니다. 실행 검증은 NOT RUN.

구현 때 필요한 제약은 다음이다.

- 프로필의 `(branch_id, review_id)`가 멤버 표의 `(branch_id, review_id)`를 참조한다. 다른 분기의 검토를 가리키면 삽입이 거절된다.
- `(branch_id, profile_id)`가 유일하다. `previous_profile_id`는 같은 `branch_id`의 프로필만 참조한다. 사업 B의 첫 버전은 `previous_profile_id`가 null이다.
- 필수 키 `idea`, `customer`, `problem`, `value`, `offer`, `revenueModel`, `market`, `operations`, `supply`, `competition`, `verification`, `judgment` 중 하나가 없으면 성공 버전으로 넣지 않는다. 빠진 키를 이전 버전이나 사업 A에서 복사하지 않는다.
- 사업 A의 프로필 행을 사업 B 삽입 때 UPDATE 하지 않는다. 과거 섹션이 비어 있는 단계 행으로 프로필을 만들지 않는다. 2절의 단계 행은 고객 칸이 비어 있을 수 있다. 분기 A 프로필은 새 분석이 쓰기 전까지 0행이다.

상태: 명세 PASS. 데이터베이스 참조와 자동 보완 금지가 동작하는지 NOT RUN.

---

## 5. 마지막 성공 분석

후보는 다음을 모두 만족하는 행이다.

1. 요청한 `branch_id`의 멤버다.
2. `role`이 `stage_review`다.
3. `status`가 `succeeded`다.
4. `sections`가 있다.
5. 그중 `finished_at`이 가장 늦다. 같으면 `version`이 큰 행이다.

`callCount >= 1`은 호출이 있었던 분석인지 보는 보조다. 이 조건만으로 프로젝트 전체를 고르지 않는다.

이번 읽기로 확인한 혼선:

| 행 | 프로젝트 최신 성공에 가까운 이유 | 분기 A의 마지막 성공 분석인가 |
| --- | --- | --- |
| `e3d42c90` | 프로젝트에서 `finished_at`이 가장 늦은 `succeeded`. sections 있음. callCount 0 | 아니오. `question_holder` |
| `cbf201a2` | 호출 1회인 성공 행 중 프로젝트에서 가장 늦음 | 예. 멤버 역할 `stage_review`일 때 |
| `d82b6ec8` | 같은 프로젝트, succeeded, sections 있음, callCount 1, 시각 2026-10-31 21:06:53 KST | 아니오. 여섯 멤버가 아님. 부모는 `beeba006` |

멤버 없이 프로젝트의 마지막 검토를 쓰면 `e3d42c90`이 나온다. 멤버 없이 `callCount >= 1`만 쓰면 지금은 `cbf201a2`가 나오지만, `d82b6ec8`도 후보 조건을 만족한다. 그 행이 더 늦게 쌓이면 분기 A의 결과를 대체한다. 그래서 멤버가 없으면 대체 행을 쓰지 않는다.

분기 A의 예상 결과는 `cbf201a2`다. 멤버 표가 없으므로 이 조회를 실행한 것은 아니다. 규칙 대조 PASS. 조회 구현 NOT RUN.

---

## 6. 마이그레이션과 롤백

착수 계획의 적용 순서는 CREATE와 INSERT뿐이다. `ai_pm_reviews`와 `ai_pm_feedback`의 컬럼 추가, UPDATE, DELETE는 없다.

`assignProjectIfUnset`은 빈 `project_id`를 UPDATE 한다. 이번 검증은 호출하지 않았다. 피벗 구현도 호출하지 않는 규칙이다. `deleteForUser`와 `deleteForProject`도 호출하지 않았다.

상태: 이번 작업에서 미사용 PASS. 저장소에 메서드가 남아 있는 것은 기존 기능이다. 피벗 코드가 없다는 점의 확인이며, 미래 코드 검사 NOT RUN.

롤백은 새 표만 역순으로 DROP 한다.

1. `consulting_business_profiles`
2. `consulting_model_calls`
3. `consulting_branch_focus`
4. `consulting_lineage_links`
5. `consulting_pivot_events`
6. `consulting_branch_members`
7. `consulting_branches`

`ai_pm_reviews`와 `ai_pm_feedback`은 DROP하지 않는다. 새 표가 기존 검토를 `on delete cascade`로 지우게 만들지 않는다. 멤버가 지워져도 검토는 남는다.

사전·사후 비교:

1. 적용 직전에 2절의 일곱 식별자를 다시 읽는다.
2. `parent_review_id`, `status`, `finished_at`, 피드백 `submitted_at`, `choiceId`, `modelCalls`를 이 표와 비교한다.
3. 다르면 멤버를 넣지 않는다. 빈 표만 만들었다면 그 표만 DROP 한다.
4. 삽입 뒤에 같은 값을 다시 읽는다. 다르면 새 표만 DROP 하고 BLOCKED로 보고한다.
5. 프로젝트 검토 수가 삽입 전과 같은지 본다. 이번 기준은 68이다. 멤버 삽입은 검토 수를 늘리지 않는다.

상태: 방법 명세 PASS. 적용과 롤백 실행 NOT RUN.

---

## 7. 분기 전환과 복귀 시나리오

실행은 NOT RUN이다. 각 단계가 지켜야 할 불변만 적는다.

1. 사업 A 생성. 분기 행과 2절의 여섯 멤버만 INSERT 한다. 검토 68건은 그대로다.
2. 사업 A의 단계 진행. 답은 A 멤버인 검토 ID에만 저장한다. 질문 보유에 답이 없으면 호출은 0이다.
3. 사업 B로 피벗. B의 1차는 새 검토이고 부모가 null이다. A 멤버를 B에 복사하지 않는다. A의 `status`는 실패로 바뀌지 않는다.
4. 사업 B의 프로필. B의 `previous_profile_id`는 null이다. A 프로필 행은 UPDATE 하지 않는다. 필수 키가 없으면 B의 성공 버전을 넣지 않는다.
5. 사업 A로 복귀. 그 사용자의 초점 행을 하나 더 넣는다. B의 멤버, 검토, 답, 프로필 버전은 그대로다.
6. A에서 다시 열 위치. 답이 없는 질문 보유 `e3d42c90`이 있으면 그 행이다. 그 행은 마지막 성공 분석이 아니다. 마지막 성공 분석은 `cbf201a2`다.
7. 사업 B로 다시 전환. 초점 행만 추가한다. B의 마지막 `stage_review`를 연다. A의 `cbf201a2`를 B의 최신으로 고르지 않는다.
8. 양쪽 확인. A와 B의 검토 `finished_at`, 피드백 본문, 프로필 행 수가 전환 전과 같다.
9. 제외 자료 재선택. 첫 사건의 `not_sent_ref_ids`에 `7d2d04e5`가 있어도 피드백 행은 남는다. 다시 고르면 새 피벗 사건만 만든다. 첫 사건은 수정하지 않는다. 그 답은 `3be5715e`의 질문과 한 쌍이고 `0a13c604`의 질문 아래에 붙지 않는다.

동시 작업:

- 초점이 B여도 저장 요청의 `review_id`가 A 멤버이면, 서버는 그 멤버의 `branch_id`와 요청의 `branch_id`가 같을 때만 쓴다. 다르면 거절한다. 초점 행을 쓰기 대상으로 쓰지 않는다.
- 같은 피벗 입력 해시는 같은 사건을 돌려준다. 유일 키는 사용자, 프로젝트, `input_sha`다.
- 서로 다른 두 확정은 검토를 공유하지 못한다. `unique (review_id)`가 막는다.
- 같은 사용자의 최신 초점은 `created_at`이 늦은 행이다. 같으면 `focus_id`가 큰 행이다. 다른 분기의 검토는 바뀌지 않는다.

상태: 시나리오 명세 PASS. 실행 NOT RUN.

---

## 8. 항목별 판정

| 검증 | 상태 | 근거 |
| --- | --- | --- |
| branch_id가 분기 식별이다 | PASS | 1절. 부모 null이 둘이고 프로젝트에 다른 성공 행이 있다 |
| 멤버 중심 소유 | PASS | 명세. 표 적용은 NOT RUN |
| review_id 단일 소속의 DB 제약 | NOT RUN | SQL은 3절에만 있고 저장소 마이그레이션과 데이터베이스에는 없다 |
| 같은 분기 안의 부모 순서 | PASS | 여섯 행의 부모는 멤버이거나 null. Preview 부모는 멤버가 아님 |
| Preview 행을 정식 멤버에서 제외 | PASS | 62개 중 샘플 3개의 부모가 여섯 행 밖 |
| 프로필과 검토의 같은 분기 제약 | NOT RUN | 4절 명세만 있음. 표와 테스트가 없다 |
| 사업 A와 B 프로필 독립 | NOT RUN | 프로필 행이 없다 |
| 빈 필드 자동 보완 금지 | NOT RUN | 프로필 작성 경로가 없다 |
| 필수 키 없으면 성공 버전 거절 | NOT RUN | 같은 이유 |
| 여섯 검토와 피드백의 부모·시각 읽기 | PASS | 2절. `cbf201a2`, `e3d42c90`은 증거 파일과 같은 시각 |
| 앞 네 검토 시각의 과거 파일 대조 | NOT RUN | 그 시각 필드가 증거 파일에 없다. 이번 읽기가 기준 |
| 프로젝트 검토 68, 질문 행의 자식 0, 피드백 0 | PASS | 5차 증거와 같다 |
| 마지막 성공 분석 규칙 | PASS | 5절. 멤버 없으면 `e3d42c90`이 최신 성공이다 |
| 그 조회의 구현 | NOT RUN | 멤버 표가 없다 |
| CREATE / INSERT만 사용하는 계획 | PASS | 6절. 이번 턴은 적용하지 않음 |
| 기존 표 변경 | NOT RUN | 변경하지 않았다. 적용 테스트도 없다 |
| assignProjectIfUnset 미사용 | PASS | 이번 턴에 호출하지 않음 |
| 삭제 메서드 미사용 | PASS | 이번 턴에 호출하지 않음 |
| 롤백이 새 표만 제거 | PASS | 6절 순서. 실행 NOT RUN |
| 사전·사후 비교 방법 | PASS | 6절 |
| 전환·복귀·재선택 시나리오 | PASS | 7절 명세 |
| 그 시나리오 실행 | NOT RUN | 테스트와 GPT를 돌리지 않음 |
| 동시 초점과 교차 저장 거절 | NOT RUN | 규칙만 있음 |
| 자동화 테스트 | NOT RUN | |
| GPT | NOT RUN | |
| Production | 잠금 | 배포하지 않음 |

---

## 9. 미해결 위험

- 데이터베이스에 `unique (review_id)`와 프로필의 `(branch_id, review_id)` 참조가 없다.
- 부모 분기를 막는 검사는 멤버 삽입 시점의 규칙으로만 있다. 기존 검토 표에는 분기 컬럼이 없다.
- 같은 프로젝트에 멤버가 아닌 검토가 62개 있다. 프로젝트 최신 행으로 되돌리면 분기가 섞인다.
- 부모 null이 분기 A 안에도 둘이라, 역할 없이 뿌리를 고르면 실패 행이 두 번째 뿌리가 된다.
- 동시 요청이 다른 분기의 `review_id`로 답을 쓰면 초점과 저장이 어긋난다. 서버 거절은 아직 없다.
- 프로필 화면 라벨이 다른 칸은 여전히 현재 패널에 없다. 그 공백을 기존 칸에 채워 넣으면 4절 금지를 어긴다.
- 5차 답은 아직 없다. 이 검증은 그 분석을 시작하지 않는다.

---

## 10. 구현 승인

Phase 3 구현 승인은 요청하지 않는다.

CPO가 이 읽기 매핑과 3절·4절의 제약 명세를 본 뒤에 승인 여부를 결정한다. 승인 전에는 마이그레이션 파일을 적용하지 않고, 멤버를 넣지 않고, 상담 코드를 바꾸지 않는다.

Production은 CEO 승인 전까지 잠금이다.
