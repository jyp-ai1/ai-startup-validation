# Design Language

**Status:** Foundation (not a Sprint)  
**Authority:** CPO · Pre-Sprint 2  
**Rule:** Cursor가 만드는 **모든 화면**은 이 문서를 기준으로 합니다.

> **Purpose:** 예쁜 화면이 아니라 **사고 흐름을 일관되게 유지**하는 규칙.

**Companion:** [DESIGN_CONSTITUTION.md](./DESIGN_CONSTITUTION.md) · [LAUNCHLENS_DESIGN_SYSTEM_1_0.md](./LAUNCHLENS_DESIGN_SYSTEM_1_0.md)

---

## Grid

| Token | Value |
|-------|-------|
| Desktop | **12-column** grid |
| Panel layout | Nav · Main · Summary (Workspace) |

---

## Width

| Surface | Max width |
|---------|-----------|
| Workspace / app shell | **1280px** (`max-w-7xl`) |
| Landing content | **1280px** (same rhythm) |
| Reading column (Main) | ~720px effective |

---

## Typography

| Level | Use |
|-------|-----|
| **H1** | Page / step title — **one per view** |
| **H2** | Section within Main |
| **Body** | Content · short sentences |
| **Caption** | Labels · meta · nav eyebrow |

No paragraph blocks in workspace. 한 화면에 H1 하나.

---

## Card

- One concept per surface
- Border minimal (`ring-1 ring-border/40` or none)
- No card spam — 정보는 패널 역할에 맞게 분배

---

## Motion

- State change: fade · subtle slide
- No decorative animation
- Toast on save · confirm actions

---

## Color

- Theme tokens only — semantic color for **state**, not decoration
- Primary accent: action · current step · success
- Muted: secondary · completed · meta

---

## Empty State

- Tell user **what to do next**, not what is missing
- One line context + one Primary CTA
- Example: *"검토 후 저장된 결정이 여기에 표시됩니다."*

---

## Loading

- Inline in context — never full-page block for thinking steps
- Copy reflects **what is happening** ("입력하신 내용을 검토하고 있습니다")
- Subtext: *"화면을 이동하지 않습니다"* when appropriate

---

## Button

| Type | Use |
|------|-----|
| Primary | Main action — filled |
| Secondary | ghost or outline |
| Destructive | confirm dialog required |

---

## CTA

- **One Primary CTA per view**
- Landing: single path → 무료 시작 / Start Free
- Workspace: one next action in Summary panel

---

## Gate

Landing · Workspace · Admin — ship 전 이 문서 참조 필수.
