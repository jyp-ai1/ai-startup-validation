# Development Workflow

How features move from idea to production in the AI SaaS Starter Kit.

---

## Overview

```
Feature Idea
    ↓
  PRD (docs/PRD.md or feature PRD from template)
    ↓
  Sprint Planning (ROADMAP + TASKS + BACKLOG)
    ↓
  Implementation (Cursor Agent + rules)
    ↓
  Review (review-checklist.mdc)
    ↓
  Merge (PR + updated docs)
    ↓
  Release (RELEASES.md + CHANGELOG.md + tag)
```

---

## Step 1: Feature Idea

- Capture in `BACKLOG.md` with ID (B-XXX)
- Rough scope and target sprint
- PM validates against product vision (`PRD.md`)

---

## Step 2: PRD

For significant features, create a PRD using [templates/PRD_TEMPLATE.md](./templates/PRD_TEMPLATE.md) or extend `docs/PRD.md`.

PRD must include:

- Problem statement
- Success criteria
- Out of scope
- Technical constraints (reference ADRs)

---

## Step 3: Sprint Planning

PM actions:

1. Move items from BACKLOG → `TASKS.md`
2. Update `ROADMAP.md` checkboxes
3. Write Cursor prompt with goal, requirements, completion criteria
4. Note ADRs if architectural choice needed

AI reads: TASKS, DECISIONS, ROADMAP, rules.

---

## Step 4: Implementation

Developer (Cursor):

1. Explain plan before terminal commands
2. Implement minimal diff
3. Update docs alongside code
4. Run `pnpm lint && pnpm build`
5. Summarize created/modified files per section

**Layer check:** Service → Repository → Adapter. No SDK leaks.

---

## Step 5: Review

Human + AI checklist (`.cursor/rules/review-checklist.mdc`):

- Scope matches sprint task
- Architecture boundaries respected
- Docs updated
- Build passes
- No secrets

PM approves terminal commands for destructive operations.

---

## Step 6: Merge

- Squash or linear history per team preference
- PR description links TASKS item
- ADR added to DECISIONS if new decision made

---

## Step 7: Release

1. Mark TASKS items ✅ Done
2. Update `RELEASES.md` and `CHANGELOG.md`
3. Tag version when milestone complete
4. Deploy per [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Sprint Cadence (Recommended)

| Phase | Duration | Output |
|-------|----------|--------|
| Planning | 1 session | TASKS.md, prompt |
| Implementation | 1–3 sessions | Code + docs |
| Review | 1 session | Merged PR |
| Release notes | Same session | RELEASES.md |

---

## AI Handoff Example

> "Sprint 3 이어서 진행"

AI workflow:

1. Read `TASKS.md` → Sprint 3 items
2. Read `DECISIONS.md` → ADR-003 adapter pattern
3. Read `BACKEND_ARCHITECTURE.md` → repository impl guide
4. Verify build baseline
5. Continue unchecked tasks

---

## Related

- [AI_WORKFLOW.md](./AI_WORKFLOW.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- `.cursor/rules/pm-workflow.mdc`
