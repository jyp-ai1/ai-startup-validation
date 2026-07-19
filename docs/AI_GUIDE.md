# AI Guide

How AI tools should work with this repository. Read this before any sprint task.

---

## First Read (Every Session)

| Priority | Document | Why |
|----------|----------|-----|
| 1 | `docs/TASKS.md` | Current sprint scope |
| 2 | `docs/DECISIONS.md` | Architecture constraints |
| 3 | `docs/ROADMAP.md` | Long-term direction |
| 4 | `.cursor/rules/*.mdc` | Behavior rules |
| 5 | `docs/PRD.md` | Product vision |

Also check: `BACKLOG.md`, relevant `ARCHITECTURE.md` / `BACKEND_ARCHITECTURE.md`.

---

## Role Split

| Role | Who | Responsibility |
|------|-----|----------------|
| PM / Architect | Human | Sprint goals, prompts, review, ADRs |
| Developer | Cursor Agent | Implementation, docs sync, lint/build |
| Reviewer | Human + AI | `.cursor/rules/review-checklist.mdc` |

---

## Prompt Structure (PM → Cursor)

Every sprint prompt should include:

1. **Goal** — one sentence
2. **Current state** — what exists
3. **Requirements** — numbered list
4. **Out of scope** — explicit exclusions
5. **Completion criteria** — file tree or checklist
6. **Verify** — `pnpm lint`, `pnpm build`

---

## AI Behavior Rules

- Explain terminal commands **before** running (unless user says auto-run).
- Summarize created/modified files **after** each major section.
- **Minimal diffs** — don't refactor unrelated code.
- **No commits** unless explicitly requested.
- Update docs when behavior changes.
- Record new architecture decisions in `DECISIONS.md`.

---

## Tool Selection

| Task | Tool |
|------|------|
| Feature implementation | Cursor Agent |
| Architecture planning | Cursor Plan mode or ChatGPT |
| Long document review | Claude (large context) |
| Quick syntax lookup | Cursor inline / Chat |
| Code review | Cursor + review-checklist rule |

See [AI_WORKFLOW.md](./AI_WORKFLOW.md) for detailed workflows.

---

## Context Handoff

When resuming a sprint ("Sprint 7 이어서"):

```
1. Read TASKS.md → find in-progress items
2. Read DECISIONS.md → confirm constraints still valid
3. Read last RELEASES.md entry → know current version
4. Run pnpm install && pnpm build → verify baseline
5. Continue from TASKS checklist
```

---

## Anti-Patterns

- ❌ Installing Supabase/AI SDK without adapter layer
- ❌ Skipping docs because "it's just a small change"
- ❌ Creating UI components in apps instead of `@repo/ui`
- ❌ Large unprompted refactors
- ❌ Force-pushing or amending pushed commits

---

## Related

- [AI_WORKFLOW.md](./AI_WORKFLOW.md)
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
- `.cursor/rules/pm-workflow.mdc`
