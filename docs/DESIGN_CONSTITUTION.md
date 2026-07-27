# LaunchLens Design Constitution

**Version:** 1.0 (Sprint 1.3.2)  
**Authority:** Supreme design law — applies to every UI change  
**Companion:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) · ADR-025

---

## North Star

LaunchLens must look like **trusted B2B SaaS** — not an AI wrapper.

Reference quality: Notion · Linear · Stripe · Vercel · ChatGPT Workspace.

> **예쁜 UI가 아니라 신뢰를 주는 SaaS UI**

---

## UI Quality First

Function without polish is **not shippable**.

Before every release, pass [UI Self Review](#ui-self-review). **One NO = do not ship.**

---

## Principles

### Less but Better

- Do not fill the screen
- Fewer cards, buttons, words
- Whitespace is trust

### Visual Hierarchy (3 seconds)

```text
① 현재 해야 하는 것
↓
② AI가 이해한 내용
↓
③ 검토
↓
④ 다음 행동
```

### Card First

- One card per concept
- No border spam
- No forced sections

### Typography

- Short sentences only
- If it looks like a paragraph, rewrite

### Color & Icon

- Color = state only (no decoration)
- Icons = help only (no ornament)

---

## UX Rules

1. Everything visible is editable
2. Every click gets a response
3. AI recommends — never judges
4. No scores — evidence only
5. **One Screen, One Thought** — one cognitive job per moment; never mix input, review, board, and choice on the same view

---

## One Screen, One Thought (Product Rule)

| Moment | User thinks |
|--------|-------------|
| Typing idea / chip | "What am I building?" |
| AI PM dialog | "Did AI understand me?" |
| Review loading | "What's happening now?" |
| Meeting board | "What did we confirm?" |
| Follow-up question | "One more thing to clarify" |
| CTA choice | "What next?" |

If two rows compete for attention, split by phase — do not stack on one screen.

---

## Review Board vocabulary (user-facing)

| Use | Avoid |
|-----|-------|
| AI가 현재 이해한 내용 | 결과 |
| 이번 검토에서 확인한 내용 | 조사 결과 |
| 현재 판단 | GO / HOLD |
| 다음으로 확인하면 좋은 내용 | 보완 |
| 현재 내용으로 검토하기 | AI 조사 시작 |

Review Board section order is **immutable**.

---

## Reference Rule

Study Premium SaaS — **do not copy**. Reinterpret in LaunchLens language.

---

## Release Rule (UI)

Ship report must include:

1. Build · Type · Lint PASS
2. Commit · Push · Preview URL
3. QA checklist
4. **Before / After screenshots**
5. **UI Self Review checklist**

"No UI improved" without screenshots is rejected.

---

## UI Self Review

- [ ] Screen does not feel cluttered
- [ ] One primary CTA per view
- [ ] Eye flows top → bottom naturally
- [ ] Enough spacing between cards
- [ ] Text could not be cut in half
- [ ] Not too many buttons
- [ ] New user knows what to do in 5 seconds

---

## Acceptance

First visit reaction target:

> **"오, 깔끔하다. 어디를 눌러야 할지 바로 알겠다."**
