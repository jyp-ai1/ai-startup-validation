# ALABOM 비용 0원 구조 — 2026-10-17

이번 기록은 새 AI 기능을 만들지 않는다. 저장소에 있는 검증을 다시 읽고, 비용 0원에서 쓸 사업성 검토 절차를 정한다. 제품 코드는 바꾸지 않았다. API를 호출하지 않았다. 웹 화면을 자동으로 열지 않았다. 실패 1·2·5와 Preview는 BLOCKED다.

## 1. 이전 검증

| 방식 | 결과 | 증거 | 지금 제품과의 차이 |
| --- | --- | --- | --- |
| 사용자가 프롬프트를 복사하고 문장을 붙여 넣음 | 로컬 화면에서 확인. 붙여넣은 문장은 참고다. 판단 문장은 유보 그대로다. 실제 GPT·Gemini 응답은 그 실행에 없다 | `AI-CONNECTION-ARCHITECTURE.txt` 경로 B, 2026-10-15T07:15:07Z | 브랜치의 `external-handoff.ts`와 여정 화면. Production `/ko/business-validation`은 404 |
| Gemini 조사 다음 GPT 반대 검토 루프 | 설계. 호출 0. 같은 모델의 두 역할은 독립 검증이 아니라고 적힘 | `EXTERNAL-AI-JUDGMENT-LOOP.txt`, `EXTERNAL-AI-JUDGMENT-DESIGN.txt` 경로 S | 제품 루프로 연결되어 있지 않음. 세션 키 이름에 옛 제품명이 남아 있음 |
| 유료 Gemini API와 OpenAI API | 키 없음. 설계만. 무인증 재호출은 403·401 | `OFFICIAL-API-ACCESS-PATH.txt`, `AI-COMM-AND-ACCURACY-REVIEW.md` | 이번 전략에서 API 연결은 제외 |
| 소비자 웹 자동화 | robots가 대화 경로를 닫음. 이후 비로그인 마커 `PINE-42` 왕복은 통신만 성공. 사업 판단이 아님 | `CONSUMER-WEB-ROBOTS-BOUNDARY.txt`, `BROWSER-REPEAT-ROUNDTRIP-POC-2026-10-16.md` | 자동화는 채택하지 않음 |
| 익명 gpt-oss-20b | 통신은 됨. A2와 예상 연매출 10억이 빠짐. Fact false. GPT가 아님 | `BUSINESS-JUDGMENT-POC.txt`, `path1.json` | 제품 상태에 넣지 않음. 실패 1 |
| 로컬 qwen2.5:3b | 원장 없이 Fact true. 품질 실패 | `path4.json`, `METHOD-COMPARE.txt` | 외부 GPT·Gemini가 아님. 실패 2의 저장 출력 |
| Clinicflow Demo | Production에서 열림. 실패 1·2·5 입력이 아님 | `CEO-BROWSER-PATH-2026-10-17.md` | 현재 공개 여정 |
| CEO가 GPT와 Gemini 정확도를 직접 본 경험 | CPO가 이번 지시에서 전달. 저장소의 같은 입력 비교 원문은 없음 | 이번 지시문 | 순서 우위의 실험 증거로 쓰지 않음 |

## 2. 후보 비교

비용 칸은 ALABOM이 모델을 호출하지 않을 때의 값이다. 사용자 웹 이용 한도는 서비스가 바꿀 수 있다. 무제한으로 적지 않는다.

| | A. GPT 다음 Gemini 다음 ALABOM | B. Gemini 다음 GPT 다음 ALABOM | C. 한 AI와 반론 프롬프트 |
| --- | --- | --- | --- |
| 비용 | API 0. 새 구독 0 | 같음 | 같음 |
| 사용자 작업 | 질문 복사, GPT 실행, Gemini 실행, 두 응답 붙여넣기 | 순서만 바뀜 | 한 번 실행과 반론 요청 |
| 검증 품질 | 저장소에 이 순서의 사업 결과 쌍이 없음 | 같음. 루프 설계는 Gemini 조사를 앞에 두었으나 실행 원문이 없음 | 설계문이 같은 모델의 두 역할을 독립 검증으로 두지 않음 |
| 안정성 | 사람이 각 웹을 연다. ALABOM은 그 화면을 읽지 않음 | 같음 | 한 서비스가 막혀도 진행 가능 |
| 구현 | 두 응답을 나누어 저장하는 칸이 제품에 없음 | 같음 | 현재 붙여넣기 한 칸에 가깝다 |

채택 절차는 A다. ALABOM이 표준 질문을 만들고, 사용자가 GPT 웹에서 1차 분석을 하고, Gemini 웹에서 빠진 위험과 반대 논리를 적은 뒤, 두 문장을 ALABOM에 붙인다. ALABOM은 합의, 충돌, 근거 부족, 미확인을 나누고 다음 검증 행동을 제안한다. 두 문장이 같아도 시장 증거가 없으면 사실로 올리지 않는다.

이 순서는 CPO가 전한 CEO 검토 경험을 기본 절차로 둔 것이다. 저장소에는 같은 사업으로 A와 B를 견준 원문이 없다. 순서에 따른 품질 차이는 미확인이다. B를 틀린 구조로 두지 않는다. C는 두 번째 웹을 열 수 없을 때의 대체다. C의 결과를 두 모델 교차 검증으로 적지 않는다.

웹 자동화, 세션 추출, 비공식 엔드포인트, OpenAI API, Gemini API, 무료 한도의 API 연결은 넣지 않는다.

## 3. 비용

이번 확인의 외부 AI API 호출은 0건이다. 새 유료 서비스는 0건이다. Production commit은 `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`다.

남은 비용 위험. Vercel에 Production이 이미 있다. Supabase는 저장소의 DB 어댑터로 남아 있고, 화면 문구는 인증 미설정을 말한다. 이번 턴에 청구서와 사용량 한도를 열 계정은 없다. 기존 호스팅 청구가 0원이라는 증명은 없다. 그 청구서는 계정 소유자가 확인한다. 새 인프라는 추가하지 않는다.

## 4. 이미 있는 기능과 없는 기능

브랜치에 있음. Production에는 없음.

- `prepareAnalysisRequest`가 실행 ID와 질문을 만든다. `liveModelCall`은 false다.
- `acceptPastedAnalysis`가 문장 하나를 참고로 저장한다. `verifiedFact`는 false다. 판단 문장을 사실로 바꾸지 않는다.
- 여정 화면의 붙여넣기 칸. 라우트 `/ko/business-validation`.

없음.

- GPT 웹과 Gemini 웹으로 가는 안내 링크.
- 두 응답을 제공자별로 저장하는 칸.
- 합의, 충돌, 근거 부족, 미확인을 두 응답에서 나누는 비교.
- 그 비교가 다음 검증 행동으로 이어지는 화면.
- 실패 1·2·5를 제품 화면에서 끝내는 경로.

이 없는 기능은 이번 턴에 만들지 않는다. Preview 배포가 실패하고, 실패 1·2·5가 BLOCKED인 상태에서 새 화면을 넣지 않는다.

## 5. BLOCKED 유지

| 항목 | 최신 상태 |
| --- | --- |
| 실패 1 | path1은 A2와 예상 연매출 10억이 없고 Fact false. Production 라우트 없음 |
| 실패 2 | path4 Fact true. 함수는 그 필드를 검증 성공으로 읽지 않음. Production에 함수 파일 없음 |
| 실패 5 | 기대 `PARTIAL`. 함수는 `VALID`, mergeable true. 브라우저에서 그 질문까지 미도달 |
| Preview | 배포 `7134972631`, SHA `e58d597c`, 상태 failure. 빌드 로그 본문 미확인. 주소는 Vercel 로그인 |
| Production | `0b465226`. Clinicflow Demo는 열림. 세 실패의 완료 화면은 아님 |

## 6. 수정과 테스트

수정 파일 없음. 테스트 재실행 없음. 배포 없음. 증거는 이 파일과 위 경로다.

## 7. 다음 실행

사람이 같은 사업 입력을 GPT 웹과 Gemini 웹에서 직접 실행하고 두 원문을 저장하기 전까지, 순서 A와 B의 품질 차이는 미확인으로 둔다. 그 실행은 ALABOM의 자동 호출이 아니다. 실패 1·2·5와 Preview는 그 실행과 별도로 BLOCKED다.
