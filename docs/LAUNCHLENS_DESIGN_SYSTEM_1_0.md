# LaunchLens Design System 1.0

**Status:** Pre-Sprint 2 (CPO mandate)  
**Authority:** Companion to [DESIGN_CONSTITUTION.md](./DESIGN_CONSTITUTION.md) · [LAUNCHLENS_DESIGN_SYSTEM.md](./LAUNCHLENS_DESIGN_SYSTEM.md)

> **Purpose:** 예쁜 화면이 아니라 **사고 흐름을 일관되게 유지**하는 규칙.

---

## Grid & width

| Token | Value |
|-------|-------|
| Max content width | **1280px** (`max-w-7xl`) |
| Grid | **12-column** (desktop) |
| Panel layout | Nav · Main · Summary |

---

## Spacing

**8px system** — 4 · 8 · 16 · 24 · 32 · 48 · 64

---

## Typography

| Level | Use |
|-------|-----|
| H1 | Page / step title (one per view) |
| H2 | Section within Main |
| Body | Content |
| Caption | Labels · meta · nav eyebrow |

Short sentences. No paragraph blocks in workspace.

---

## Card

- One concept per surface
- Border minimal (`ring-1 ring-border/40` or none)
- No card spam

---

## Button / CTA

- **One Primary CTA per view**
- Secondary = ghost or outline
- Destructive = confirm dialog

---

## Panel structure (Workspace)

```text
Left   — Workflow + Decision Memory (navigation only)
Center — Thinking (selected step or decision detail)
Right  — AI Summary (status · opinion · one next action)
```

Never duplicate the same information across panels.

---

## Color tokens

Use theme tokens only — semantic color for state, not decoration.

---

## Motion

- State change: fade · subtle slide
- No decorative animation
- Toast on save · confirm actions

---

## Sprint gate

Landing · Workspace · Admin must all reference this doc before ship.
