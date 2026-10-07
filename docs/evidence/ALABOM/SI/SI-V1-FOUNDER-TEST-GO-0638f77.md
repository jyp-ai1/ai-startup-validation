# Founder Test 실행 Evidence — `0638f77`

**CPO Gate:** GO  
**엔진 / Production:** `0638f77` 불변 · Fix 없음  
**입력:** 동일 PDF 원문 Source (요약·재작성 없음)  
**PDF 업로드 422:** Input 계층으로만 기록. S.I. 품질과 혼합하지 않음.  
**Source:** `docs/evidence/ALABOM/SI/founder-test-sources/{ridm,lmulm,juinjip}-source.txt`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-founder-test-go-0638f77.json`  
**측정:** 2026-10-07T23:00:17Z

CEO가 Production 워크스페이스에 위 Source를 붙여 넣으면 같은 입력이 된다.

CTO는 기록만. Founder Decision Value 판정은 3사업 일괄 후 CPO.

---

## Input 계층 (S.I. 품질 아님)

Production `POST /api/intake/extract-document` → `422` / `pdf.worker.mjs` 없음.  
이번 테스트는 로컬 동일 SHA 추출 원문을 사용.

---

## 1. RIDM AI

**Source:** 9335 chars · RIDM AI / 플로트 / Float / ridm.ai 원문

### t0
- 판단: 조건부 사업화 가능 / S3
- 근거(가능): 분사·공급망·운영 자산, 제품/앱 출시, 구체적 문제
- 리스크/CU: 가치가 실제 지불로 이어지는가
- DCE: 최초 유료 거래 또는 파일럿 + 전후 성과
- Priority: 가까운 결제 후보에게 유료 제안
- 질문: 유료 제안/받은 돈? (`paid_conversion`) — t0 DCE와 맞음

### 재판단
| 답 | class | 결과 | 다음 행동 |
|---|---|---|---|
| 결제 2명·유료 1건 | VALIDATED | viable / 사업화 가능성이 높음 | **재판매** 질문 |
| 생각만, 결제 없음 | CLAIM | 조건부 유지 | 같은 유료 질문 |
| 유료 고객 없고 제안 안 함 | ASSUMPTION | 조건부 유지 · CU→결제자 분리 | payer_split |

**8항 관찰 (판정 아님):** t0 유료 CU는 사업과 연결. 강점 문장은 일반 실행 자산. 미결제는 올리지 않음. 유료 성공 다음 질문이 재판매라 RIDM과 어긋남. “그래서 할 일”은 t0엔 유료 제안, t1 유료 후엔 재판매 확인.

**문제 유형:** Question Alignment · Business Understanding

---

## 2. LMULM

**Source:** 12937 chars · 창업사업화 / 지식서비스 / 문구 원문

### t0
- 판단: 조건부 사업화 가능 / S3
- CU: C2C 재판매가 반복되는가. 없으면 1차 판매 브랜드
- DCE: 재판매 등록·거래·재구매 데이터
- 질문: 두 번째 행동 있습니까? (`repeat_loop`) — t0 DCE와 맞음

### 재판단
| 답 | class | 결과 | 다음 행동 |
|---|---|---|---|
| 100명 중 35 등록·12 거래 | VALIDATED | 조건부 S4 · CU→세그먼트 | 세그먼트 실사용 |
| 생각만, 등록 0 | CLAIM | 조건부 유지 | 같은 재판매 질문 |
| **재판매 0 · 재구매 0** | FACT | **viable / 사업화 가능성이 높음** · delta **up** | 같은 재판매 질문 |

**8항 관찰:** t0는 플랫폼 vs 브랜드를 가른다. 미등록은 유지. 0건 FACT인데 헤드라인이 올라감. CU 문장은 여전히 “반복 없으면 브랜드”. 다음 행동은 같은 재판매 확인이지만 문장은 “가능성이 높음”.

**문제 유형:** Re-Judgment · Founder Decision Value · Evidence

---

## 3. 주인집

**Source:** 4787 chars · 취향저격컴퍼니 / 酒人集 / 예비 / 매출액 - 원문

### t0
- 판단: 조건부 사업화 가능 / S3
- 가능: **제품 또는 앱이 이미 출시**, 구체적 문제
- CU: 유료 전환 (양조장 대표로 좁히지 않음)
- 질문: 유료 제안/받은 돈? (`paid_conversion`)

### 재판단
| 답 | class | 결과 | 다음 행동 |
|---|---|---|---|
| 결제 2명 월구독 | VALIDATED | viable | **재판매** 질문 |
| 생각만, 결제 없음 | CLAIM | 조건부 유지 | 같은 유료 질문 |
| 양조장 대표 제안, 결제 0 | ASSUMPTION | 조건부 유지 | 같은 유료 질문 |

**8항 관찰:** 미결제는 올리지 않음. “앱 출시”는 예비·매출 - 원문과 어긋날 수 있음. 유료 성공 다음이 재판매. 양조장 거절을 결제자 분리로 좁히지 않음.

**문제 유형:** Business Understanding · Question Alignment

---

## 반복 패턴 (Fix 아님 · PDF 422와 분리)

1. 유료 VALIDATED 다음 질문이 재판매 (RIDM · 주인집)
2. 의도/미결제는 판단을 올리지 않음 (3/3)
3. LMULM 재구매 0 → 헤드라인 상향
4. t0 강점의 실행 자산·앱 출시 일반화

---

## CEO 8항 슬롯 (CPO 일괄 판정)

| | RIDM | LMULM | 주인집 |
|---|---|---|---|
| 1 Judgment | 유료 미확정으로 조건부 | C2C 미확정으로 조건부 | 유료 미확정으로 조건부 |
| 2 Reasoning | 가능 근거 일반화 | CU 문장 구체 | 앱 출시 의심 |
| 3 Risk | 지불 | 반복 루프 | 지불 (결제자 미분리) |
| 4 CU | 지불 = 판단 변경 가능 | 반복 = 브랜드 vs 플랫폼 | 지불 |
| 5 DCE | 유료 1건+전후 | 등록·거래·재구매 | 유료 1건+전후 |
| 6 Question | t0 일치 / t1 재판매 불일치 | t0 일치 | t0 일치 / t1 재판매 불일치 |
| 7 Re-Judgment | 미결제 유지 · 유료 상향 | 0건인데 상향 | 미결제 유지 · 유료 상향 |
| 8 Decision Value | CPO | CPO | CPO |

최종 질문: **“이 결과를 보고 실제 사업 의사결정을 할 수 있는가?”**
