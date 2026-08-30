# Conversation UX Simplification — UX Change Summary

**Sprint:** Presentation layer only · Core Engine baseline `4755e27` (DO NOT MODIFY)  
**Status:** Implementation complete · **CPO UX PASS not declared** · CEO Walkthrough **HOLD**

## Goal

Transform conversation UI from "developer validation screen" to "user talks naturally with AI PM".

## Scope boundary

| Layer | Status |
|-------|--------|
| Core engine / adaptive / gap ranking / whyNow logic / analysis gate | **UNCHANGED** |
| Presentation (React components + i18n copy) | **CHANGED** |

## P0 mapping

| ID | Requirement | Implementation |
|----|-------------|----------------|
| P0-1 | Project name only at top; seed in collapsible | `workspace-business-state-header.tsx` — `projectName` + `사업 내용 보기 ▾` |
| P0-2 | Hide BUSINESS/CUSTOMER/PROBLEM from default | `workspace-shared-understanding-panel.tsx` — collapsed `<details>`; no field labels on surface |
| P0-3 | Question-centric layout | `workspace-s11-surface.tsx` + `workspace-ai-pm-loop-panel.tsx` — question → input → submit → why → understanding → detail |
| P0-4 | Why Now collapsed by default | `ConversationWhyNowBlock` + S11 `hideWhyNow` on active loop |
| P0-5 | Simplified progress sidebar | `workspace-sidebar.tsx` — 4-step presentation map; hide overview nodes during loop; mobile bar in shell |
| P0-6 | No internal labels on default UI | Judgment/coverage/gap hints moved to `workspace-ai-pm-conversation-detail.tsx` (`▸ 상세 보기`) |
| P0-7 | User-facing copy | Removed Old Fact/New Fact/Current Understanding; natural Korean CTAs |
| P0-8 | Responsive 390×844 | Reduced padding, sticky submit on mobile, 4-row textarea, progress bar when sidebar hidden |
| P0-9 | CPO/QA detail access | Collapsed sections: understanding, why now, 상세 보기 |

## Files changed

```
apps/web/features/workflow-journey/components/project-workspace-shell/
  workspace-ai-pm-conversation-detail.tsx   (new)
  workspace-conversation-progress-bar.tsx   (new)
  workspace-ai-pm-loop-panel.tsx
  workspace-business-state-header.tsx
  workspace-shared-understanding-panel.tsx
  workspace-s11-surface.tsx
  workspace-shell.tsx
  workspace-sidebar.tsx
packages/i18n/src/messages/ko.json
packages/i18n/src/messages/en.json
```

## Verification (local)

| Check | Result |
|-------|--------|
| `pnpm build` | PASS |
| `core-final-stabilization.test.ts` | **77/77 PASS** |
| Production real-adaptive smoke | **Pending deploy** |
| Desktop / 390×844 screenshots | **Pending capture post-deploy** |

## BEFORE baseline (reference)

Pre-change conversation surface showed by default:

- `current-judgment-block` with "현재 판단", coverage %, critical gap hints
- S11 blocks: 지금까지 이해한 내용 / 지금 판단 / 이번 질문 / 다음 (with inline whyNow)
- Header: multi-line business headline via `WorkspaceBusinessStateHeader`
- Shared understanding: always-visible BUSINESS · CUSTOMER · PROBLEM grid

Reference captures: `docs/evidence/ALABOM/cpo-validation/real-adaptive-vnext/media/`

## AFTER (expected default surface)

- Project name + optional `사업 내용 보기 ▾`
- **지금 질문** (hero typography)
- Answer textarea + **답변 반영하기**
- Collapsed: `▸ 왜 지금 이 질문인가요?` · `▸ 지금까지 AI가 이해한 내용` · `▸ 상세 보기`
- Sidebar: 4 steps (사업 이해 / 시장 검증 / 사업성 검토 / 결과 확인) without score/% during loop

## Next gates

1. Deploy presentation diff to Production
2. ONE `_cpo-real-adaptive-prod-capture.spec.ts` smoke (regression: reAsk=0)
3. Desktop + 390×844 screenshot capture → `media/`
4. CPO UX review → then CEO Walkthrough unlock
