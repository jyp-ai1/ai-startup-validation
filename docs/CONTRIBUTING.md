# Contributing

Thank you for contributing to the AI SaaS Starter Kit.

---

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Cursor IDE (recommended for AI-assisted workflow)

---

## Setup

```bash
git clone <repo-url>
cd cursor-project
pnpm install
cp .env.example .env.local   # optional until Sprint 3
pnpm dev
```

---

## Workflow

1. Read [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
2. Pick a task from [TASKS.md](./TASKS.md) or [BACKLOG.md](./BACKLOG.md)
3. Create branch: `sprint-N/feature-name`
4. Implement with tests/docs as needed
5. Run `pnpm lint` and `pnpm build`
6. Open PR using [PULL_REQUEST_TEMPLATE](../.github/PULL_REQUEST_TEMPLATE.md)

---

## Commit Messages

```
type(scope): imperative summary

Optional body explaining why.
Reference sprint or ADR if relevant.
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

---

## Pull Requests

- One concern per PR
- Link to TASKS.md item or BACKLOG ID
- Update docs if behavior changes
- Ensure CI passes (when configured)

---

## Architecture

Follow the adapter pattern — see [DECISIONS.md](./DECISIONS.md) ADR-003.

Do not import database or AI SDKs outside adapter packages.

---

## Questions

Open a [question issue](../.github/ISSUE_TEMPLATE/question.md) or discuss in PR comments.
