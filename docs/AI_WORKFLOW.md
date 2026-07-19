# AI Workflow

Detailed workflows for Cursor, ChatGPT, and Claude when working on this project.

---

## Cursor (Primary — Implementation)

### When to Use

- Sprint implementation
- Refactoring within architecture rules
- Doc generation
- Lint/build fixes

### Session Start Checklist

```
□ Read docs/TASKS.md
□ Read docs/DECISIONS.md (ADRs)
□ Read relevant .cursor/rules/*.mdc
□ Read sprint-specific architecture docs
□ pnpm install && pnpm build (verify baseline)
```

### Agent Mode Best Practices

1. **Paste full sprint prompt** — include out-of-scope and completion criteria
2. **Review terminal commands** before Accept (PM role)
3. **One sprint concern per session** when possible
4. **Ask for summary** after each major section
5. **Don't commit** unless explicitly requested

### Cursor Rules

Rules in `.cursor/rules/` apply automatically:

- `alwaysApply: true` — every session (architecture, git, PM, docs, naming, folder-structure)
- `globs` — when matching files open (coding-style, security, testing)

### Handoff Phrase

> "Sprint N 이어서 진행" → AI reads TASKS + DECISIONS + ROADMAP first

---

## ChatGPT (Planning & Exploration)

### When to Use

- Sprint planning and prompt drafting
- Comparing architectural alternatives before ADR
- Explaining concepts to stakeholders
- Drafting PRD sections from templates

### Best Practices

1. Provide project context: paste PRD summary + relevant ADR
2. Ask for **Cursor-ready prompts** with numbered requirements
3. Use for brainstorming **before** locking decisions in DECISIONS.md
4. Don't paste secrets or `.env` contents

### Output Format

Request structured output:

```
Goal:
Requirements:
Out of scope:
Completion criteria:
Cursor prompt:
```

---

## Claude (Review & Long Context)

### When to Use

- Reviewing large diffs or architecture docs
- Summarizing multi-sprint history
- Writing comprehensive documentation
- ADR alternatives analysis

### Best Practices

1. Upload or paste: DECISIONS.md, ARCHITECTURE.md, TASKS.md together
2. Ask for gap analysis against ROADMAP
3. Use for **review** not primary implementation (Cursor has repo access)
4. Cross-check ADR rationale before accepting recommendations

---

## Multi-Tool Workflow

```
┌─────────────┐     PRD / Sprint Plan      ┌─────────────┐
│  ChatGPT    │ ─────────────────────────► │   PM Human  │
│  (planning) │                              │  (review)   │
└─────────────┘                              └──────┬──────┘
                                                    │ prompt
                                                    ▼
                                             ┌─────────────┐
                                             │   Cursor    │
                                             │ (implement) │
                                             └──────┬──────┘
                                                    │ diff
                                                    ▼
                                             ┌─────────────┐
                                             │   Claude    │
                                             │  (review)   │
                                             └─────────────┘
```

---

## Documentation Sync Rule

Whichever tool made a decision → human records in `DECISIONS.md`.

Whichever tool finished work → update `TASKS.md`.

---

## Anti-Patterns

| Anti-pattern | Why bad | Instead |
|--------------|---------|---------|
| Cursor implements without reading TASKS | Wrong scope | Always read TASKS first |
| ChatGPT writes code without repo context | Drift from patterns | Use Cursor for code |
| Skipping DECISIONS for "small" DB choice | Tech debt | Write ADR |
| Multiple AI tools editing same file | Conflicts | One implementer (Cursor) |

---

## Related

- [AI_GUIDE.md](./AI_GUIDE.md)
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
- `.cursor/rules/pm-workflow.mdc`
