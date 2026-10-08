# Accuracy Batch Independent — 8 unseen businesses × 9 failure-induction scenes

**CPO Gate:** 측정 전용 · CTO self-PASS ≠ 승인 · Preview/Production 미검증  
**Fix Gate:** **CANDIDATE** (구조 실패가 서로 다른 사업에서 반복되고 Founder Decision Value FAIL 22)  
**Merge:** HOLD · **CEO Founder Test:** HOLD  
**Production:** `0b46522` UNCHANGED  
**Frozen:** #139 Draft `0c362c7` · #140 / #192 / #193 dump SHA Lock 미변경  
**PR:** #194 · Draft · base `main`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-independent.json`  
**Vercel:** `docs/evidence/ALABOM/SI/VERCEL-DEPLOY-LIMIT-DIAGNOSIS.md`

공장형 #139–#193(10×15 음식·액티비티)의 답을 정답으로 복사하지 않았다. 엔진·analyzer·presenter·classifier는 이 PR에서 변경하지 않았다.

## 규모

| 사업 | 도메인 | 지표 | STAKE_NOUN 허용 목록 |
|---|---|---|---|
| 냉동물류 IoT | B2B 3PL 센서 | 온도 초과 | 없음 |
| 치과기공 매칭 | 헬스케어 마켓플레이스 | 재작업 | 없음 |
| 굴착기 단기렌탈 | 중고 건설장비 | 공회 | 없음 |
| 임상 피험자 모집 | CRO | 노쇼 | **있음** |
| 선박 급유 중개 | 해운 B2B | 급유 지연 | 없음 |
| 산업 3D 수탁 | 제조 수탁 | 치수 불량 | 없음 |
| 학교급식 잔반 | 공공 급식 | 잔반 | 없음 |
| 소상공인 해외송금 | 핀테크 B2B | 불일치 | **있음** |

장면(사업당 9): 정상 · 계획/의도 · 부분 지불 · 지불+지표 · 부정 악화 · 직접 충돌 · 매출·재구매 0 · 잘못된 축 · CLOSED 재질문. **8 × 9 = 72.**

## 축 집계 (로컬 엔진 출력 대조)

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | 50 | 0 | **22** |
| Evidence | 52 | 0 | **20** |
| CU | 66 | 6 | 0 |
| Question Alignment | 71 | 1 | 0 |
| Founder Decision Value | 43 | 7 | **22** |
| 종합 | 37 | 7 | **28** |

generic-after-promotion: **0**

이 숫자는 Preview/Production에서 확인한 값이 아니다. 로컬 vitest가 Production SHA `0b46522` 엔진을 돌린 결과다.

## 실패 유형과 재현

| 유형 | 장면 | 사업 수 | 내용 |
|---|---|---|---|
| `over_promote_on_partial` | 지불만 | **6** (미등록 지표) | 지불만으로 `conditionally_viable` / S3. #104는 노쇼·불일치에서만 유지. |
| `missed_downgrade` | 부정 악화 | **6** (미등록 지표) | 지표가 다시 나빠져도 조건부 S3 유지. 노쇼·불일치는 CONFLICT로 보류. |
| `leftover_positive` | 잘못된 축 · 재질문 | **8 × 2** | `사업화 가능성이 높음` + `상업 실행 증거가 없다`가 한 문장. 잘못된 축(C2C 재판매) 답이 S4 viable로 승격. |
| `stake_blind_overfit` | 정상 CU | **6** PARTIAL | CU/질문이 `온도 초과` 등 실제 지표를 말하지 않고 일반 유료 전환만 묻는다. |

교차 사업 질문 축: t0 8개 모두 `paid_conversion`. 재판매로 이탈 0. 미등록 지표 6개는 지표 없는 일반 유료 질문, 허용 목록 2개만 `노쇼`/`불일치`를 묻는다.

## 핵심 합격 기준 대조

* 판단 정확성: **미등록 지표 사업에서 지불만으로 조건부 승격.** 공장 골든셋(이탈·노쇼·부하)에서는 안 보이던 과대평가.
* 질문 정합성: 허용 목록 사업은 CU·질문이 지표를 묶는다. 나머지 6개는 같은 축(유료)이지만 그 사업의 DCE를 묻지 못한다.
* 증거 처리: 계획/의향은 CLAIM으로 유지(8/8). 지불만은 VALIDATED. 미등록 지표에서는 그 VALIDATED가 S3로 이어진다.
* 재판단: 허용 목록은 부정·충돌을 내린다. 미등록 지표는 부정 악화를 무시한다. 충돌(결제 취소)은 8/8 보류.
* 일반화: **실패는 사업 이름이 아니라 `STAKE_NOUN` 허용 목록 여부에 묶인다.** #192/#193 PASS는 이 목록 안의 반복이다.
* Founder Decision Value: 미등록 지표 Founder는 왜 조건부인지, 자기 지표를 다음에 왜 재야 하는지 들을 수 없다. 승격 후에는 매출 있음/없음이 한 판단에 공존한다.

## Fix Gate

**CANDIDATE.** 엔진 수정은 하지 않았다. CPO 2-pass 전 구현 금지.

개방 근거(규칙): `over_promote_on_partial` · `missed_downgrade` · `leftover_positive`가 서로 다른 사업에서 반복되고 Decision Value FAIL ≥ 3.

CEO Founder Test / Merge / Production 변경: **금지.**

## 기존 회귀 (실행함)

| 게이트 | 파일 | 결과 |
|---|---|---|
| #104 / Partial DCE | `partial-dce-promotion.test.ts` | 7/7 PASS |
| #107 / Reconciliation | `si-evidence-reconciliation.test.ts` | 7/7 PASS |
| P1-A | `si-question-alignment-p1a.test.ts` | 4/4 PASS |
| P1-C | `si-p1c-dce-normalize.test.ts` | 5/5 PASS |
| P0-1 | `recovery2-p0-1-state-edit-confirm.test.ts` | 8/8 PASS |
| P0-2 | `recovery2-p0-2-question-loop.test.ts` | 5/5 PASS |

합 36. 실행하지 않은 게이트는 PASS로 적지 않는다.

## Vercel

원인: Hobby/free **일일 배포 생성 한도**. 오류 코드 `api-deployments-free-per-day`, 전문 `Resource is limited - try again in 24 hours (more than 100)`. Build Logs 없음(빌드 시작 전 API 거절). GitHub Actions check-runs 0 — CI 실패와 다른 사건.

24h GitHub Deployments: Preview 139 + Production 8 = 147. 문서상 Hobby 일일 100을 초과.

조치: 공장 Preview 중단. 요금제 변경 없음. dump SHA Lock 변경 없음. Production `0b46522` 미변경. #194는 측정 PR이며 Preview 검증 완료로 보지 않는다. 재시도 금지.

## 미변경

Analyzer · Judgment · classifier · Presenter · SoT · Auth · #139 · #140 · #192 · #193 · Production `0b46522`
