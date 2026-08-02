# S7 Contract Recovery — Regression Spec (CPO Approved v2)

**RC SHA:** `d2f7c4add34ebfb1b58904b5fd6f35151923b191`  
**Environment:** Single localhost (`http://localhost:3000` **or** `3001` — never both)  
**Product code changes during Regression Sprint:** ⛔ forbidden

---

## Result enum

| Result | When |
|--------|------|
| **PASS** | Precondition ✓, Action ✓, Exit Criteria ✓ |
| **FAIL** | Precondition ✓, Action ✓, Exit Criteria ✗ (product defect) |
| **NOT EXECUTED** | Abort Criteria hit, or Precondition/Action incomplete |

**Never FAIL without completed Action.**

---

## Fixed record order (mandatory)

```
Precondition → Action → Expected → Observed → Evidence → Exit Criteria → Result
```

---

## RC completion chain

```
RC Commit (d2f7c4a)
    ↓
Regression execution (this spec)
    ↓
Evidence Commit
    ↓
Release Candidate Final
```

---

## Scenario #1 — Placeholder PDF (Trust Contract)

### Precondition

- RC `d2f7c4a` on single localhost port.
- User in **workspace** document intake (not demo/start picker only).
- PDF placeholder body available (analyzable, **not readable**): contains `PDF 본문은 아직 추출되지 않았습니다`.

### Action

1. Paste/submit PDF placeholder via workspace intake (`#workspace-doc-paste` → start).
2. Enter AI PM loop / first post-intake surface.
3. Observe Trust vs Reading vs read-claim copy.

### Expected

- Trust Block (honest unreadable copy).
- No Reading animation sequence.
- No `문서를 읽어보니` false-read claim.
- User can reach Question without trust break.

### Abort Criteria

- Cannot reach workspace intake → **NOT EXECUTED**
- Document rejected before workspace (not analyzable) → **NOT EXECUTED**
- Loop never appears after intake → **NOT EXECUTED**

### Exit Criteria

- [ ] Trust Block visible (or equivalent unreadable honesty copy)
- [ ] Reading animation absent
- [ ] No `문서를 읽어보니` in visible UI

### Observed / Evidence / Result

_(filled in REGRESSION_EXECUTION_d2f7c4a.md)_

---

## Scenario #2 — Loop → Sidebar + Header sync (State Contract)

### Precondition

- Readable workspace document loaded.
- `#ai-pm-loop` visible.
- Customer issue ready; Sidebar customer **not** completed before answer.

### Action

1. Submit `customer_definition` loop answer (≥4 chars).
2. Wait for recognition (~3–5s).
3. Inspect Sidebar customer node + Header snapshot (no manual refresh).

### Expected

- Sidebar customer → **completed**.
- Header reflects same customer segment.
- No Loop/Sidebar split.

### Abort Criteria

- `#ai-pm-loop` not visible → **NOT EXECUTED**
- No customer issue presented → **NOT EXECUTED**
- Sidebar not visible → **NOT EXECUTED**

### Exit Criteria

- [ ] Sidebar customer shows completed state
- [ ] Header contains answered customer segment
- [ ] Same viewport/session (no reload)

### Observed / Evidence / Result

_(filled in REGRESSION_EXECUTION_d2f7c4a.md)_

---

## Scenario #3 — Review gate disabled + reason (Review Contract)

### Precondition

- Natural flow: `understandingPhase === 'review-ready'` (no storage injection alone).
- `review.canStart === false` with user-facing blocked reason.
- Next Step panel with "검토 시작" visible.

### Action

1. Locate "검토 시작" button.
2. Verify disabled + reason text visible.

### Expected

- Button disabled when blocked.
- User-facing reason (not internal phase names).
- No silent no-op.

### Abort Criteria

- review-ready UI not reached → **NOT EXECUTED**
- Next Step panel not visible → **NOT EXECUTED**
- Only sessionStorage injection used → **NOT EXECUTED**

### Exit Criteria

- [ ] Button disabled
- [ ] Blocked reason copy visible (e.g. customer_missing message)
- [ ] No click produces silent nothing

### Observed / Evidence / Result

_(filled in REGRESSION_EXECUTION_d2f7c4a.md)_

---

## Scenario #4 — Pause / Resume (State persistence)

### Precondition

- Loop ≥1 turn persisted in sessionStorage.
- Sidebar/Header reflect loop progress.

### Action

1. Record pre-reload Sidebar + Header + turn count.
2. Reload page (same project/demo session).
3. Re-inspect Sidebar, Header, turn count.

### Expected

- Turn count unchanged.
- Sidebar/Header consistent with pre-reload.

### Abort Criteria

- Loop turns = 0 → **NOT EXECUTED**
- Storage cleared on reload → **NOT EXECUTED**

### Exit Criteria

- [ ] Turn count identical after reload
- [ ] Sidebar customer state matches pre-reload
- [ ] Header snapshot consistent

### Observed / Evidence / Result

_(filled in REGRESSION_EXECUTION_d2f7c4a.md)_

---

## Scenario #5 — Demo Fresh scenario switch

### Precondition

- Entry via `fresh=1` (`/demo/start` clear or `?fresh=1`).
- sessionStorage scope: `demo-session`.

### Action

1. `sample=launchlens` + `fresh=1` → verify `취향저격` in document storage.
2. `sample=manufacturing` + `fresh=1` → read document storage.

### Expected

- Step 1: taste doc loaded.
- Step 2: no taste bleed; manufacturing content present.

### Abort Criteria

- `fresh=1` not used → **NOT EXECUTED**
- Document key empty after load → **NOT EXECUTED**

### Exit Criteria

- [ ] Step 1 document contains `취향저격`
- [ ] Step 2 document does NOT contain `취향저격`
- [ ] Step 2 document contains manufacturing sample markers

### Observed / Evidence / Result

_(filled in REGRESSION_EXECUTION_d2f7c4a.md)_

---

## Scenario #6 — Authenticated new project E2E

### Precondition

- QA auth session (magic link / test account).
- New project workspace, no prior loop/review state.

### Action

1. Paste readable doc → AI PM start.
2. Complete loop to review-ready.
3. Review gate observe → start if enabled.

### Expected

- S7-1/2/3 contracts hold end-to-end.
- No "why is this broken?" stop moment.

### Abort Criteria

- Auth unavailable → **NOT EXECUTED**
- Project creation fails → **NOT EXECUTED**
- Loop cannot complete → **NOT EXECUTED** (do not mark product FAIL)

### Exit Criteria

- [ ] Document → loop → review-ready without trust/state/review contract break
- [ ] Review gate behaves per Spec #3 at review-ready

### Observed / Evidence / Result

_(filled in REGRESSION_EXECUTION_d2f7c4a.md)_
