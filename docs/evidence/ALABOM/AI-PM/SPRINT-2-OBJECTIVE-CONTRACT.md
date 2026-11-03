# Sprint 2 Objective 선택 계약

**시각:** 2026-11-03 11:33 KST

**판정:** Sprint 2 PARTIAL. 이 문서는 응답 계약과 제품 저장 경로의 기록이다. 실제 GPT 3차와 4차는 이 문서의 시점에 호출하지 않았다.

## 계약

단계 스키마는 호출마다 `continuesObjectiveId`를 미해결 objective id와 `__new__`로 제한한다. 해결된 id는 enum에 없다. 서버는 해결된 id, 알 수 없는 id, 같은 질문 문장, 표현만 바꾼 같은 목적을 거절한다. `__new__`는 닫힌 목적과 다른 새 부족분에만 남는다.

`answerEvidence`는 `questionKey`, 답 원문, `provenance`, `FOUNDER_CLAIM`이다. `judgmentReason`은 답 원문과 유지 또는 변경의 설명을 그대로 요구한다.

같은 답으로 저장된 실패 행은 다시 호출하지 않는다. 성공한 부모 행은 바꾸지 않는다.

## 테스트

비실시간 여정 테스트 351건이 통과했다. 추가된 계약 테스트도 통과했다. `ai-pm-quality-compare.test.ts`의 미리보기 픽스처 2건은 이번 diff에 없는 질문 개수 문구 차이라 이번 수정으로 다루지 않았다.

## 제품 저장 경로

후속 라우트는 `openReviewBackend`와 `submitConsultingStage`와 `readGptApiKey`를 쓴다.

`PRODUCT_PATH_LIVE=1`에서 격리 사용자 `c0ffee00-1111-4000-8000-0000000002a2`, 격리 프로젝트 `bc12a6f4-45b7-47b2-b266-ef61cd4013d9`로 주입 응답을 저장했다. 저장소는 `kind: supabase`, `productionDatabase: true`, `durable: true`, sqlite `filePath: null`이다. 1차와 2차와 3차 행이 `succeeded`로 저장됐고, 다음 요청 본문에 이전 판단 문장이 있었다. 다른 vitest 프로세스가 같은 행을 읽었다. 그 세 행과 그 피드백만 지웠다.

호출 뒤 Founder 검토 70, Founder 프로젝트 검토 68, Founder 프로젝트 172이다. 실패 행 `0e75ff46-88fd-4ce2-b567-bdc3f3048531`, `9d51935d-891e-424c-b3f1-9b1c5e529c2f`, `8ec32bae-461b-449a-99b7-db95a92fb2c0`의 Supabase 건수는 0이다.

이 저장 검증은 주입 응답이다. 실제 GPT 결과가 아니다.

## 무결성

`docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json` SHA-256은 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다.

이 프로세스의 `GPT_API_KEY`는 ABSENT다. Production 배포는 하지 않았다. Sprint 3는 시작하지 않았다.
