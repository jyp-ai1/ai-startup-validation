# S7 Regression Execution — RC `d2f7c4a`

**Date:** 2026-08-02  
**Environment:** `http://localhost:3000` (single port — 3000 only)  
**RC SHA:** `d2f7c4add34ebfb1b58904b5fd6f35151923b191`  
**Runner:** `apps/web/scripts/s7-regression-execution.mjs`  
**Product code changes during Regression Sprint:** none

---

## Summary

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Placeholder PDF (Trust) | **PASS** | `regression-01-pdf-placeholder.png` |
| 2 | Loop → Sidebar + Header sync | **PASS** | `regression-02-loop-sidebar-header.png` |
| 3 | Review gate disabled + reason | **PASS** | `regression-03-review-disabled.png` |
| 4 | Pause / Resume | **PASS** | `regression-04-pause-resume.png` |
| 5 | Demo Fresh scenario switch | **PASS** | `regression-05-demo-switch.png` |
| 6 | Authenticated new project E2E | **NOT EXECUTED** | _(Abort: Auth unavailable)_ |

**PASS: 5 / 6 executed · Product FAIL: 0**

---

## Scenario #1 — Placeholder PDF (Trust Contract)

### Precondition

- RC `d2f7c4a` on single localhost port 3000.
- Workspace intake via `?demo=guided&sample=custom&fresh=1` → `#workspace-doc-paste` visible.
- PDF placeholder body pasted (analyzable, not readable).

### Action

1. Paste PDF placeholder into `#workspace-doc-paste`.
2. Click **AI PM과 시작하기**.
3. Observe Trust vs Reading vs read-claim copy (no continue click before capture).

### Expected

- Trust Block with honest unreadable copy.
- No Reading animation sequence.
- No `문서를 읽어보니` false-read claim.

### Observed

Trust block rendered: `아직 PDF 내용을 읽을 수 없습니다` / `본문은 아직 추출되지 않았습니다`. No Reading animation. No read-claim copy.

### Evidence

Screenshot: `regression-01-pdf-placeholder.png`

### Exit Criteria

- [x] Trust Block visible (or equivalent unreadable honesty copy)
- [x] Reading animation absent
- [x] No `문서를 읽어보니` in visible UI

### Result

**PASS**

---

## Scenario #2 — Loop → Sidebar + Header sync (State Contract)

### Precondition

- `?demo=guided&sample=manufacturing&fresh=1` → `#ai-pm-loop` visible after read-ack advance.
- Customer issue presented (`누가 실제 고객입니까?`).
- Sidebar customer **not** completed (`🟡 고객 확인 중`, not `✓`).

### Action

1. Submit `customer_definition` loop answer (≥4 chars).
2. Wait ~5s for recognition.
3. Inspect Sidebar customer node + Header snapshot (no reload).

### Expected

- Sidebar customer → completed.
- Header reflects same customer segment.
- No Loop/Sidebar split.

### Observed

After answer: Sidebar shows `✓ 고객 확인`. Header/business snapshot shows customer segment (`공장장` / `대표` / manufacturing context). Same session, no reload.

### Evidence

Screenshot: `regression-02-loop-sidebar-header.png`

### Exit Criteria

- [x] Sidebar customer shows completed state
- [x] Header contains answered customer segment
- [x] Same viewport/session (no reload)

### Result

**PASS**

---

## Scenario #3 — Review gate disabled + reason (Review Contract)

### Precondition

- Natural flow on manufacturing demo (no sessionStorage injection).
- Loop completed through customer / problem / BM turns.
- Next Step panel with **검토 시작** visible at review-ready.

### Action

1. Locate **검토 시작** button after natural loop completion.
2. Verify disabled state + blocked reason text visible.

### Expected

- Button disabled when blocked.
- User-facing reason (not internal phase names).
- No silent no-op.

### Observed

At review-ready: **검토 시작** disabled (`disabled=true`). Blocked reason copy visible (`reasonVisible=true`). No silent click behavior.

### Evidence

Screenshot: `regression-03-review-disabled.png`

### Exit Criteria

- [x] Button disabled
- [x] Blocked reason copy visible
- [x] No click produces silent nothing

### Result

**PASS**

---

## Scenario #4 — Pause / Resume (State persistence)

### Precondition

- Loop ≥1 turn persisted in sessionStorage after customer answer.
- Sidebar reflects loop progress.

### Action

1. Record pre-navigation loop sessionStorage + Sidebar snapshot.
2. Navigate to same demo session **without** `fresh=1` (avoids intentional demo wipe).
3. Re-inspect loop storage + Sidebar.

### Expected

- Turn count unchanged.
- Sidebar/Header consistent with pre-navigation.

### Observed

`launchlens.aiPmLoop.demo-session` identical before/after (`loopMatch=true`). Sidebar snapshot matches (`sidebarMatch=true`).

**Protocol note:** `page.reload()` on URL containing `fresh=1` clears demo session by design — navigation without `fresh=1` used per Abort Criteria guard.

### Evidence

Screenshot: `regression-04-pause-resume.png`

### Exit Criteria

- [x] Turn count identical after reload/navigation
- [x] Sidebar customer state matches pre-navigation
- [x] Header snapshot consistent

### Result

**PASS**

---

## Scenario #5 — Demo Fresh scenario switch

### Precondition

- Entry via `fresh=1` on each sample switch.
- sessionStorage scope: `demo-session`.

### Action

1. `sample=launchlens` + `fresh=1` → verify `취향저격` in document storage.
2. `sample=manufacturing` + `fresh=1` → read document storage.

### Expected

- Step 1: taste doc loaded.
- Step 2: no taste bleed; manufacturing content present.

### Observed

Step 1: `tasteLoaded=true` (`취향저격` in storage). Step 2: `tasteBleed=false`, `mfgLoaded=true` (제조/스마트팩토리 markers).

### Evidence

Screenshot: `regression-05-demo-switch.png`

### Exit Criteria

- [x] Step 1 document contains `취향저격`
- [x] Step 2 document does NOT contain `취향저격`
- [x] Step 2 document contains manufacturing sample markers

### Result

**PASS**

---

## Scenario #6 — Authenticated new project E2E

### Precondition

- QA auth session (magic link / test account).
- New project workspace, no prior loop/review state.

### Action

_(not run)_

### Expected

- S7-1/2/3 contracts hold end-to-end.

### Observed

QA auth session unavailable in local regression environment.

### Evidence

_(none — NOT EXECUTED)_

### Abort Criteria

- Auth unavailable → **NOT EXECUTED**

### Exit Criteria

- [ ] Document → loop → review-ready without contract break _(not applicable)_

### Result

**NOT EXECUTED**

---

## RC completion chain status

```
RC Commit (d2f7c4a)          ✅
Regression execution         ✅ (this document)
Evidence Commit              ⏳ pending
Release Candidate Final      ⏳ pending CPO gate
```

---

## `git status` (pre–Evidence Commit)

S7 application source unchanged since `d2f7c4a`. Evidence artifacts in `docs/evidence/S7-REGRESSION/` updated by this run. Untracked out-of-scope files (lighthouse, `.tmp`, other docs) remain outside RC scope.
