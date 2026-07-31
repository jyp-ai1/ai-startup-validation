# Workspace Layout Prototype (Phase 0)

> **Epic 3 · Phase 0** — UI Prototype Review (CPO mandatory gate)  
> **Status:** 🟡 Awaiting founder review  
> **Do not start Phase 1 (React layout)** until founder says: *"이 정도면 피그마 느낌이 난다."*

---

## Open the prototype

**Option A — double-click**

Open in browser:

[`workspace-layout-prototype.html`](./workspace-layout-prototype.html)

**Option B — local server**

```bash
npx serve docs/prototypes
# → http://localhost:3000/workspace-layout-prototype.html
```

---

## What this is

| Included | Excluded |
|----------|----------|
| GNB | AI / LLM |
| Sidebar (○ ● ✔ dummy nav) | API |
| Main (AI PM + Overview views) | React / Next.js |
| Business Score (dummy) | Router / state store |
| Recommended Next Step (inline) | Animation |

Use the **top tabs** to switch:

1. **AI PM (첫 진입)** — Workspace opens here  
2. **Overview (생성 후)** — Score + Summary + Next Step  

**New in revision 2:** AI PM Status Strip · Sidebar Summary (74 · 67%) · spacing tune · Customer question copy (Founder ≠ Customer)

Spend **~5 minutes** clicking Sidebar items and both tabs.

Full analysis: [`../sprints/EPIC3_PRE_IMPLEMENTATION_REVIEW.md`](../sprints/EPIC3_PRE_IMPLEMENTATION_REVIEW.md)

---

## Founder review checklist

| Question | Pass? |
|----------|-------|
| Sidebar 폭 적당한가? | ☐ |
| Main 답답한가? (호흡감) | ☐ |
| GNB 너무 큰가? | ☐ |
| Business Score 위치? | ☐ |
| Action(Next Step) 위치 — Summary 바로 이어지는가? | ☐ |
| AI PM 존재감? | ☐ |
| **Overall: Figma 느낌?** | ☐ |

**Gate:** All checked + overall Figma feel → approve Phase 1.

---

## Stop Rule (during Phase 1+ implementation)

If any of these occur during React implementation — **stop, screenshot, escalate**:

- Sidebar feels too narrow  
- Main feels cramped  
- Scroll too long before Next Step  
- Action not visible  
- AI PM doesn't feel like the protagonist  

Fix spacing in **prototype first**, then re-implement.

---

## Related

- [`../sprints/EPIC3_WORKSPACE_LAYOUT.md`](../sprints/EPIC3_WORKSPACE_LAYOUT.md)
- [`../PRODUCT_PRINCIPLES.md`](../PRODUCT_PRINCIPLES.md)
