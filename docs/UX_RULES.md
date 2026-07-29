# LaunchLens UX Rules

> **CPO Sign-off:** Sprint P1 — UX 구조 고정  
> **Authority:** This document overrides ad-hoc layout changes. Cursor must read before any UI work.

---

## 1. Workspace는 하나만 존재한다

- **Project Workspace** (`/validation?project=:id`) is the only place users do strategy work.
- There is no second workspace, legacy shell, or parallel canvas.
- `/projects/*` and duplicate hubs are **forbidden** entry points.

## 2. 페이지를 새로 만들지 않는다

- Do **not** create `/execution`, `/strategy`, `/evidence` as standalone pages.
- Do **not** add global stub routes (`/reports`, `/research`, …).
- New capability = **section or panel inside Project Workspace**.

## 3. 모든 기능은 Workspace 안에서 해결한다

- Review, Evidence, Strategy, Execution live **inside** one canvas.
- Page navigation is minimized; **Main content swaps**, URL may use hash or query for section only.

## 4. 좌측은 Navigation이다

- Left column = **tree navigation** (Review → sub-items).
- Tree **grows as AI PM progresses** (Summary ✔, Market ✔, …).
- Not a permanent app sidebar with unrelated modules.

## 5. 우측(Main)은 현재 작업만 보여준다

- Main shows **one focus** at a time (current section content).
- No three-column enterprise layout (Left | Center | Right).

## 6. Action은 항상 첫 화면에서 보인다

- Recommended **Action** appears above the fold on Review.
- User sees **current state → recommended Action** without scrolling.

## 7. Evidence는 보조 정보다

- Evidence is **drawer, expand, or secondary panel** — not the primary scroll.
- First screen = Summary + Action; Evidence on demand.

## 8. 사용자는 스크롤보다 클릭을 덜 해야 한다

- Prefer **click section in nav** over long vertical scroll through all sections.
- AI PM interview: progress visible in **nav tree**, not endless question stack.

---

## Layout freeze (Epic 7)

See **`docs/DESIGN_SYSTEM.md` Part 1** for the frozen GNB + Navigation + Main shell.

---

## Terminology (user-facing)

| Say | Don't say |
|-----|-----------|
| Workspace | Validation (to users) |
| Review | Dashboard, Decision Center |
| Project Workspace | Old projects shell |

Internal route `/validation` is fine in code; docs and UI copy use **Workspace**.

---

## Before any UI PR

- [ ] Read `docs/SCREEN_MAP.md` and this file
- [ ] No new routes without CPO approval
- [ ] No layout column changes without CPO approval
- [ ] QA by **user journey**, not single screen
