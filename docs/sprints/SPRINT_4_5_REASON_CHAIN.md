# Sprint 4.5 — Reason Chain & AI PM Thinking Flow

**Status:** ✅ SHIPPED  
**Mission:** UI가 아니라 **AI PM의 사고 흐름**을 완성한다 — 화면 간 논리 단절 제거.

---

## CPO Diagnosis

> UI는 좋아졌는데 AI PM의 사고가 연결되지 않는다.  
> 각 화면은 맞는데 하나의 컨설팅이 아니라 각각 따로 노는 화면.

**Target experience:**

```
① 문서를 분석했습니다.
↓
② 시장성을 검토했습니다.
↓
③ Google Trends (기간 + 수치)
↓
④ 그래서 시장은 충분
↓
⑤ 하지만 가격 모델 없음
↓
⑥ 그래서 가격 검토
↓
⑦ 시장 판단 상승
```

---

## P0 Deliverables

| # | Item | Status |
|---|------|--------|
| P0-1 | **Reason Chain Engine** — `왜 → 그래서 → 다음` step chain | ✅ |
| P0-2 | **Evidence Metadata** — period, badge (DATA/SEARCH/…), why expandable | ✅ |
| P0-3 | **Document Citation** — PDF page + section + finding | ✅ |
| P0-4 | **Terminology** — 대표 / 서비스 사용자 / 타겟 사용자 구분 | ✅ |
| P0-5 | **Contextual References** — 자료 추천 이유 표시 | ✅ |

---

## Implementation map

| Layer | File |
|-------|------|
| Types | `lib/v2-reason-chain-types.ts` |
| Engine | `lib/v2-reason-chain-engine.ts` |
| Reason chain UI | `components/v2/v2-reason-chain-bridge.tsx` |
| Evidence cards | `components/v2/v2-evidence-metadata-card.tsx` |
| PDF citations | `components/v2/v2-document-citation-block.tsx` |
| Smart Intake wiring | `components/v2/v2-smart-intake-flow.tsx` |
| Sample demo wiring | `components/v2/v2-demo-experience.tsx` |
| i18n | `reasonChain` · `reasonChainSample` · `evidenceMeta` · `evidenceMetaSample` |

---

## Demo flow (connected narrative)

**Sample project:** opinion → evidence → changeDetected → strategyImprovement each show progressive Reason Chain + metadata evidence.

**My Project (PDF):** document profile → citations → chain through pricing → improvement.

---

## Exit criteria

- Every AI opinion step shows prior reasoning chain context
- Evidence shows period baseline (e.g. 최근 3개월 +28%)
- PDF upload shows page-level citations for gaps
- Reference materials include why recommended
- Terminology distinguishes founder vs service users
