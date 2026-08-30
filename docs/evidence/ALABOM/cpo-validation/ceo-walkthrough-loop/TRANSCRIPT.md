# CEO Walkthrough Loop — Semantic Reproduction Transcript

Synthetic transcript from unit-level reproduction (not live Production capture).

**Seed:** `외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.`

---

## BEFORE (@4755e27 logic — failing CEO path)

| Turn | AI question (gap) | User answer | semanticFactKey | customerPersona closed? | Next Q |
|------|-------------------|-------------|-----------------|-------------------------|--------|
| 1 | 이 서비스를 가장 필요로 하는 구체 고객은 누구인가요? (`customerPersona`) | 예약 전에 맞춤 일정을 원하는 방한 외국인 | **`diffRelevance`** | **NO** | same persona Q (reframe) |
| 2 | (reframe) customerPersona | 동선 낭비 없이 여행하고 싶은 외국인 | **`diffRelevance`** | **NO** | same persona Q |
| 3 | (reframe) customerPersona | 차별점을 예약 전에 체감하고 싶은 사람 | **`diffRelevance`** | **NO** | same persona Q |

**Loop mechanism:** `listUnconfirmedCriticalGaps()` keeps `customerPersona` open; ranking re-selects same gap.

---

## AFTER (post-fix — local)

| Turn | AI question (gap) | User answer | semanticFactKey | customerPersona closed? | Next Q |
|------|-------------------|-------------|-----------------|-------------------------|--------|
| 1 | 이 서비스를 가장 필요로 하는 구체 고객은 누구인가요? (`customerPersona`) | 예약 전에 맞춤 일정을 원하는 방한 외국인 | **`customer`** | **YES** | `problemJtbd` (or next ranked gap) |
| 2 | 지금 가장 크게 해결하려는 불편은 무엇인가요? | (continues journey) | — | — | — |

---

## Harness contrast (why reAsk=0 hid the bug)

Harness @ T14 uses BANK.customer:

`초기 타깃은 서울을 3~7일 방문하는 FIT 외국인(밀레니얼·MZ)이고, 혼자 또는 2인 여행이 많습니다.`

Contains `FIT`, `MZ`, `초기 타깃`, `2인 여행` → always matched personaSegmentCue → gap closed. CEO free-form omits these tokens.
