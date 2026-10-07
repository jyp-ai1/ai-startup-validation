# PR #118 — P0 Re-Judgment CPO 2-Pass Evidence

**HEAD:** `c0b9bc3`  
**Fix:** `0b3429f`  
**Production:** `0638f77` 불변  
**Preview:** https://ai-startup-validation-git-cursor-si-ne-243c22-jyp-ai1s-projects.vercel.app  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-neg-rejudgment-2pass.json`  
**Merge/Deploy:** 금지

입력: `1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.`

---

## Pass 1 — 기능 정확성

### 1. Root Cause

같은 답이 축을 갈라 처리됐다.

- `1차 판매` → `revenue` FACT
- `재구매 0` → `unverified` ASSUMPTION
- CONFLICT 없음, C2C CU OPEN
- `decideVerdict`가 `hasRevenue ? 'viable'` → headline만 상향

측정 0건이 같은 C2C/재판매 축에서 판매 FACT와 재조정되지 않았다.

### 2. 변경 파일

- `analyze-strategic-intelligence.ts` — `repeat_zero` FACT, `repeatMeasuredUnproven()`, 승격 차단
- `update-strategic-intelligence.ts` — 하향/측정 0은 delta `up` 금지
- `si-negative-rejudgment.test.ts` / `si-neg-rejudgment-2pass-dump.test.ts`
- 미변경: Auth, PDF, Question Engine, Persistent SoT, 사업명 분기

### 3. LMULM Negative 입력 및 Before/After

**입력:** `1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.`

**Founder Test 경로** (T0 = `conditionally_viable`, 0638f77에서 `viable`로 상향되던 경로)

| | Before (`0638f77` 실측) | After (`c0b9bc3`) |
|---|---|---|
| Verdict | `conditionally_viable` → **`viable`** | `conditionally_viable` → **`conditionally_viable`** |
| Headline | 사업화 가능성이 높음 | 조건부 사업화 가능 |
| Stage | S3 → S3 | S3 → S3 |
| Delta | `up` | `unchanged` |
| `roseToViable` | true | **false** |

**LMULM calibration** (T0 already `viable` — 판매 FACT가 문서에 이미 있음)

| | T0 | T1 after 0건 |
|---|---|---|
| Verdict | `viable` | **`conditionally_viable`** |
| Headline | 사업화 가능성이 높음 | 조건부 사업화 가능 |
| Stage | S3 | S3 |
| Delta | — | **`down`** |
| Risk | C2C 반복 미확인 | **재구매·재판매가 0건이라 반복 사업은 검증되지 않았다** |
| Validation | 초기 판매는 있으나 반복 검증은 없다 | **1차 판매는 유지되지만 재구매·재판매 0건이라 반복성은 미검증이다** |

`재판매 0 / 재구매 0 → viable 상향` **재현되지 않음.**

### 4. Positive scenario

입력: `최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.`

| | T0 | T1 |
|---|---|---|
| Class | — | VALIDATED |
| Verdict | `viable` | `viable` |
| Stage | S3 | **S4** |
| Delta | — | **`up`** |
| Strength | 판매·출시 | + **반복 사용 또는 재구매가 검증되어 있다** |
| CU | C2C 반복적으로 발생하는가 | **현재 강점이 반복 가능한 사업으로 이어지는가** |

정상 승격 유지.

### 5. Partial scenario

입력: `재구매 2건은 있었으나 재판매 등록은 0건이다.`

| | T0 | T1 |
|---|---|---|
| Class | — | FACT (not VALIDATED, not CONFLICT) |
| Verdict | `conditionally_viable` | `conditionally_viable` |
| Stage | S3 | S3 |
| Headline | 조건부 사업화 가능 | 조건부 사업화 가능 |
| CU | C2C OPEN | C2C OPEN |

전체 DCE 충족으로 승격하지 않음. S4/`viable` 없음.

### 6. Evidence classification

같은 0건 답변:

- Founder classify: **FACT** / `validationStrength`
- Analyzer: `resale_thesis` CLAIM + `revenue` FACT + `repeat_zero` FACT
- **ASSUMPTION으로 승격되지 않음**
- **CONFLICT 아님**

### 7. Evidence reconciliation

- 1차 판매 FACT 유지 (strengths: `실제 판매·매출 증거가 있다`)
- 반복 0 FACT 유지 (risk + validation summary)
- 판매 FACT가 반복 미검증을 우회해 headline을 올리지 않음
- Inference: `재구매·재판매 0건은 1차 판매를 부정하지 않지만, 반복 사업이 검증됐다는 뜻은 아니다.`

### 8. CU 변화

| Path | T0 CU | T1 CU | Question |
|---|---|---|---|
| Negative LMULM | C2C 반복적으로 발생하는가 | **동일, OPEN** | `repeat_loop` |
| Negative founder | C2C 반복적으로 발생하는가 | **동일, OPEN** | `repeat_loop` |
| Positive 35/12 | C2C 반복적으로 발생하는가 | **이동** (다음 반복 성과) | 기존 presenter |

0건 후 CU CLOSED 없음.

### 9. DCE 충족 여부

DCE: `있으면 반복 가능한 양면 시장으로 올리고, 없으면 1차 판매 브랜드로 내린다.`

- Negative 0건 → DCE **미충족** → 내림/유지 (`conditionally_viable`)
- Positive 35/12 → DCE **충족** → S4
- Partial 2건+0 → DCE **미충족** → 승격 없음

### 10. Judgment / Stage / Headline

| Case | Judgment | Stage | Headline |
|---|---|---|---|
| LMULM Negative | viable → conditionally_viable | S3 → S3 | 가능성이 높음 → **조건부** |
| Founder Negative | conditionally_viable 유지 | S3 → S3 | **조건부 유지** |
| Positive | viable 유지 | S3 → **S4** | 가능성이 높음 |
| Partial | conditionally_viable 유지 | S3 → S3 | 조건부 |

모순 없음. S4는 반복 VALIDATED일 때만.

---

## Pass 2 — 회귀/무결성

| # | Gate | Result |
|---|---|---|
| 1 | #104 payment-only off S3 | PASS |
| 2 | #107 재구매 0 ≠ CONFLICT / not S4 | PASS |
| 3 | P0-1 | PASS |
| 4 | P0-2 | PASS |
| 5 | S.I. regression | **179 passed** (SI + P0-1 + P0-2) |
| 6 | Positive promotion | S4 / `viable` / delta `up` |
| 7 | Negative downgrade/hold | LMULM `down` · founder path `unchanged` · not `viable` |
| 8 | Partial promotion 방지 | not S4 / not `viable` |
| 9 | Commit SHA | Fix `0b3429f` · HEAD `c0b9bc3` |
| 10 | Preview | Ready · https://ai-startup-validation-git-cursor-si-ne-243c22-jyp-ai1s-projects.vercel.app |

CI 2/2 SUCCESS. Production `0638f77` 불변. Merge/deploy 없음.
