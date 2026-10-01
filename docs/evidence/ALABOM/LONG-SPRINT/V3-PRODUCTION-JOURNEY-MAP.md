# Long Sprint E — Production journey vs V3 SoT (reference)

**SoT frozen:** Journey stages, agent contracts, provider ports. This map ties UI surfaces to V3 without changing contracts.

| Stage | User action | Primary surface | Persistence |
|-------|-------------|-----------------|-------------|
| Landing | CTA → login/demo | `launch-lens-landing` | funnel events |
| Workspace | Open project | `v2-authenticated-workspace` / `v2-strategy-workspace` | project snapshot |
| Input / Document | Paste or upload | intake + `saveWorkspaceDocumentText` | per `projectId` |
| Understanding | Read + Q loop | `workspace-ai-pm-main` + loop panel | loop store + understanding phase |
| Correction | Edit confirm | `workspace-understanding-edit-flow` | domain memory merge |
| Stage A | Gap Q (customer/problem/payer) | loop `viewMode=understanding` | turn log |
| Stage B | Alignment | `workspace-next-step-panel` aligning | alignment state |
| Judgment | Evidence + GO/HOLD | loop `viewMode=judgment` | judgment canonical |
| Final Review | Confirm understanding | `final-understanding-confirm` | phase `review-ready` |
| Next Action | Handoff CTA | next-step + validation handoff | funnel + snapshot |

**Demo isolation (Gate 1 + Long Sprint):**

- Sample: `demo-sample-{slug}` + playback materializer
- My Business: `demo-my-{sessionId}` + preview cap (no Judgment/Final Review)
- Production: authenticated project ids only — no `getDemoSample` hydration on auth path

**Regression anchors (historical P0):** SmartPM literal, cross-project storage, slot merge, correction rollback, Final Review reachability — covered by unit tests + Production browser scripts.
