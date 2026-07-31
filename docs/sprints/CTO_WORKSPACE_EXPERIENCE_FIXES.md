# CTO Workspace Experience Fixes

> **Status:** Sprint 5 — compressed P0 (first 3 minutes)  
> **North star:** User feels *"AI is reading my business"* within 3 minutes — not *"I must fill a form"*.

---

## This sprint — 4 items only

| # | P0 | User should feel | Done when |
|---|-----|------------------|-----------|
| **1** | AI read evidence first | "AI already read my doc" | Checklist: ✓ 창업자 · ✓ 사업 · ✓ 고객 후보 … + unconfirmed list **before** any input |
| **2** | Minimize direct input | "I confirm / tweak, not type from zero" | AI-filled drafts (✓ values), not empty fields; edit is secondary |
| **3** | Review start works or explains | Never "?? bug?" | Start runs **or** Korean reason e.g. *"고객만 하나 더 확인하면 검토를 시작할 수 있습니다"* |
| **4** | Demo = Workspace | Same shell, sample project, promote on login | `/demo/enter` → workspace shell + sample doc → login → project continues |

Everything else (full PDF extraction, all-domain Unknown, score from pipeline) is **P1+**.

---

## Philosophy vs current UI

```
Sprint 1–4:  Unknown → Read Before Speak → Align → Review
Current bad: Form → Form → Form → dead Start
Target:      Read → Discover → Confirm → Align → Review
```

---

## P0-1 — AI read evidence (first screen)

**Bad:** Sidebar shows Founder / Business / Customer labels only — looks like CRM.

**Good:**

```
AI PM — 문서를 읽었습니다.

✓ 창업자 — …
✓ 사업 — …
🟡 고객 후보 — …
○ 시장 — …
○ 경쟁 — …

현재 확인하지 못한 내용
• …
```

**Implementation:** `WorkspaceBusinessUnderstandingCard` + `discovery-summary.ts`  
**Sidebar presence:** `nodeStatus.*` — ✓ 창업자 확인 / 🟡 고객 확인 중 / ○ 시장 분석 대기

---

## P0-2 — No empty forms first

**Bad:** Blank inputs + `+` buttons before AI voice.

**Good:** Confirmed expressions as ✓ chips; withhold zone for customer; Accept / Edit / Together.

**Remaining CTO work:** Wire `edit` / `together` to guided correction (not raw grid). Hide any legacy domain field editors on first path.

**Files:** `workspace-business-understanding-card.tsx`, `workspace-domain-fields.tsx` (wire or delete from path)

---

## P0-3 — Review start

**Bad:** Decorative overview "Start" with no handler; alignment Start disabled silently.

**Fixed in branch:** Overview dead button removed; alignment shows conversational block reason.

**Files:** `workspace-business-alignment-block.tsx`, `workspace-progressive-overview.tsx`

---

## P0-4 — Demo = Workspace

**Bad:** `V2DemoExperience` separate linear mock.

**Fixed in branch:** `demo-guided` uses `ProjectWorkspaceShell` + `TASTE_COMPANY_FULL_SAMPLE` document seed.

**Remaining:** Login CTA at review boundary; phase restore after promote (sessionStorage keys).

**Files:** `v2-strategy-workspace.tsx`, `demo/enter/route.ts`, `demo-project-promoted-tracker.tsx`

---

## Product language (not literal translation)

| Avoid | Use |
|-------|-----|
| Business Score | 사업성 검토 결과 |
| Summary | AI PM 요약 |
| Recommended Next Step | AI PM이 제안하는 다음 단계 |
| Start | 검토 시작 |

Keys: `workflow.journey.workspaceShell` in `packages/i18n/src/messages/ko.json`

---

## P1+ (not this sprint)

- Real PDF text extraction (placeholder today)
- PDF upload on authenticated workspace
- Per-node overview content (not mock B2B paragraph)
- Score from review pipeline (not hardcoded 74)
- Full Unknown pattern on all domains

---

## CEO acceptance (3-minute test)

1. Open demo → within 10s see **문서를 읽었습니다** checklist (Korean).
2. No empty primary form before confirming understanding card.
3. Sidebar shows **🟡 고객 확인 중** (or similar), not English node names.
4. Start review or see **why not** in Korean.
5. Login after demo → same project text, no re-upload.

---

## Related docs

- `docs/WORKSPACE_FLOW.md`
- `docs/sprints/BUSINESS_UNDERSTANDING_VALIDATION.md`
- `docs/first-trust/ZERO_LIE_CORPUS.md`
