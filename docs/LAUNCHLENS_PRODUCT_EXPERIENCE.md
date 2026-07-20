# LaunchLens Product Experience Bible

**Version:** 1.0  
**Sprint:** PX 1.0 — Product Experience (no code)  
**Status:** Draft — awaiting PM Design Review  
**Authority:** This document is the **primary source of truth** for *why* LaunchLens exists and *how* it should feel.  
**Companion:** [LAUNCHLENS_DESIGN_SYSTEM.md](./LAUNCHLENS_DESIGN_SYSTEM.md) — visual and component implementation (secondary)

> **Read order for Cursor:** This Bible first → Design System second → then implement.

---

## What This Document Is

| Document | Answers |
|----------|---------|
| **Product Experience Bible** (this file) | *Why* — philosophy, voice, journey, decision-first IA |
| **Design System** | *How* — tokens, spacing, wireframes, components |

Cursor builds components well. This Bible ensures Cursor knows **why** each screen exists.

---

## 1. Product Philosophy

**LaunchLens is not an admin tool. LaunchLens is an AI Startup Partner.**

We do not sell:
- A CRUD workspace
- A validation checklist
- A document generator
- A research notebook

We sell:
- **Confidence** — "Is my startup worth pursuing?"
- **Clarity** — "What should I do next?"
- **Credibility** — "Would a VC take this seriously?"

### Positioning

| Avoid | Use |
|-------|-----|
| AI Startup Validation Platform (internal/legacy) | **AI Startup Intelligence Platform** |
| Startup validation tool | **Your AI Co-Founder for Startup Decisions** |
| Framework | **LaunchLens** (product brand) |

**One-line promise:**

> LaunchLens helps founders make startup decisions with the rigor of a VC and the speed of AI.

### What we are

```
Consulting firm intelligence
+ VC decision framework
+ AI that speaks first
= LaunchLens
```

### What we are not

- Notion with extra columns
- ERP for startups
- Spreadsheet with AI bolted on
- Feature menu disguised as a product

---

## 2. Brand Voice

### Tone attributes

| Attribute | Yes | No |
|-----------|-----|-----|
| Register | Institutional, executive | Casual, playful |
| Confidence | Direct recommendations | Hedging everywhere |
| Length | Short, decisive | Long essays |
| Emotion | Calm authority | Hype, exclamation marks |
| Audience | Founder, advisor, investor | Developer, intern |

### Brand voice examples

**Good:**
> "Market signals are strong. Customer evidence is insufficient. Complete 15 VOC interviews before investor conversations."

**Bad:**
> "Great job! 🎉 You might want to consider doing some more customer interviews when you get a chance!"

### Naming in UI

- Product: **LaunchLens**
- Subtitle: **AI Startup Intelligence Platform**
- Footer/About only: "Powered by AI Startup Validation Framework" (technical lineage, not headline)

---

## 3. AI Persona (LaunchLens AI)

**Role:** Senior startup consultant. McKinsey-meets-YC advisor.

**Speaks:** Third person about the startup ("시장성은 높습니다"), never "I think maybe..."

**Never:**
- Overly friendly chatbot tone
- Emoji-heavy responses
- Generic motivational quotes
- Hiding behind "it depends" without a recommendation

**Always:**
- Leads with a **verdict** (GO / REVIEW / HOLD)
- States **one primary gap**
- States **one expected impact** if action is taken
- Uses evidence counts when available ("VOC 12건 기준...")

### AI Summary template (3 lines)

```
Line 1 — Opportunity: what is working
Line 2 — Gap: what is missing or risky
Line 3 — Impact: what happens if user acts
```

**Example:**
> 시장성은 우수합니다.  
> 현재 가장 부족한 것은 VOC입니다.  
> 인터뷰 15건 확보 시 투자 준비도가 약 8점 상승할 것으로 예상됩니다.

### Verdict language

| Verdict | When | UI label |
|---------|------|----------|
| GO | Core criteria met, manageable risk | GO |
| REVIEW | Promising but gaps in 1–2 categories | REVIEW / Conditional GO |
| HOLD | Critical gaps, not investor-ready | HOLD |

---

## 4. VC Persona

**Role:** Series A partner reviewing a deck.

**Focus:** Market size, unit economics signal, moat, investability.

**Voice:** Skeptical but fair. Numbers over narrative.

**Example:**
> "Market size and business model show investable signals. Due diligence on unit economics recommended before term sheet."

**UI placement:** Expert Opinion card — VC  
**When insufficient data:** "Insufficient validation data for a confident investor view. Complete market and traction evidence first."

---

## 5. PM Persona

**Role:** Product leader validating problem-solution fit.

**Focus:** Customer pain, VOC depth, MVP scope, PMF signals.

**Example:**
> "Problem-solution fit is supported by VOC data. MVP scope can be narrowed with confidence."

**When insufficient data:** "Customer pain is undocumented. Prioritize structured discovery before feature development."

---

## 6. CTO Persona

**Role:** Technical due diligence lead.

**Focus:** Feasibility, architecture risk, scalability, build vs buy.

**Example:**
> "Technical execution path is feasible with current evidence. Architecture decisions can proceed."

**When insufficient data:** "Execution feasibility is unclear. Add technical evidence and define MVP architecture."

---

## 7. Marketing Persona

**Role:** GTM strategist.

**Focus:** Positioning, differentiation, competitive narrative, early adopter story.

**Example:**
> "Competitive positioning is differentiated. GTM narrative can be sharpened for early adopters."

**When insufficient data:** "Market positioning is undifferentiated. Complete competitor analysis first."

---

## 8. Information Hierarchy

**Users want conclusions, not menus.**

### What the user must NEVER see first

```
Research
Evidence
VOC
Competitors
Government
[feature menu as hero]
```

That is **admin IA**. It says: "You figure out where to click."

### What the user MUST see first

```
AI Summary
↓
Startup Readiness (number)
↓
Decision (GO / REVIEW / HOLD)
↓
Action Center
```

That is **intelligence IA**. It says: "Here is the answer. Here is why. Here is what to do."

### Product-level hierarchy (reversed from admin tools)

**Old (wrong):**
```
Dashboard → Projects → Research → Evidence → Documents
```

**LaunchLens (correct):**
```
Dashboard → Decision → Evidence → Documents
                ↓
         (Research is supporting, not primary)
```

Research supports decisions. It is not the product entry point.

### Route priority (user mental model)

| Priority | Layer | User question answered |
|----------|-------|------------------------|
| 1 | Dashboard | "How ready am I?" |
| 2 | Decision / AI Summary | "Should I proceed?" |
| 3 | Action Center | "What do I do next?" |
| 4 | Evidence | "Why do you say that?" |
| 5 | Documents (AI Studio) | "Give me something to share" |
| 6 | Research | "Help me gather more input" |

---

## 9. Decision First Principle

Every screen follows:

```
1. Conclusion (AI speaks)
2. Confidence (number + grade)
3. Reason (insights / reasoning)
4. Action (what to do)
5. Proof (cards, charts)
6. Raw data (table — last)
```

**Rules:**

| Rule | Meaning |
|------|---------|
| Input < Output | Show results before forms |
| Table last | Tables are evidence archives, not homepage |
| Card before table | Scannable intelligence before rows |
| Number before text | 84 before paragraph |
| AI speaks first | Summary card above everything |

**If a screen violates Decision First, it fails Product Review.**

---

## 10. User Journey

### Primary journey — Founder

```
Open LaunchLens
    ↓
See Dashboard
    ↓
Read: 84 · Grade A · GO          ← emotional hook (relief / excitement)
    ↓
Ask internally: "Why?"
    ↓
Read AI Summary (3 lines)
    ↓
Ask: "What should I do?"
    ↓
Action Center → Priority 1
    ↓
Complete action (e.g. VOC interviews)
    ↓
Return to Dashboard
    ↓
Score increases (+8)
    ↓
Success moment — achievement, progress visible
    ↓
Share / export document (AI Studio)
```

### Secondary journey — Advisor / VC viewer

```
Open project
    ↓
Hero: Readiness + GO + Top 12%
    ↓
Expert Opinions (VC, PM, CTO, Marketing)
    ↓
Evidence snapshot
    ↓
Export Validation Report
```

### Emotional arc

| Stage | Emotion target |
|-------|----------------|
| First 3 seconds | "This looks serious — like PitchBook" |
| After Hero | "I know where I stand" |
| After AI Summary | "I understand why" |
| After Action | "I know exactly what to do" |
| After completion | "I'm making progress" |

---

## 11. Success Moment

**Definition:** The moment the user feels LaunchLens is worth paying for.

**Primary success moment:**
> Dashboard reloads after completing an Action → **Readiness score visibly increases** (+N points shown).

**Secondary success moments:**
- AI Summary changes from REVIEW → GO
- Expert card shifts from neutral → positive
- Empty state → first high-confidence evidence added
- Document status: Generating → Completed

**Design requirement:** Every action completion must **surface impact** (score delta, verdict change, or progress bar). Silent updates fail.

**Copy for success:**
> "Startup Readiness increased by 8 points. VOC evidence now supports Conditional GO."

---

## 12. Empty State Philosophy

Empty is not "nothing here." Empty is **"AI cannot advise yet."**

### Structure

```
Illustration (minimal, not playful)
Title — what's missing for intelligence
Description — why it matters for decision
Primary CTA — one clear action
Secondary — sample import / learn more
```

### Tone

**Good:**
> "No customer evidence yet. LaunchLens needs VOC data to assess problem-solution fit."

**Bad:**
> "No items found. Click + to add."

### Rules

- Never show an empty table as the main view
- Always show AI Summary in "insufficient data" mode with honest HOLD/REVIEW
- Sample import reduces time-to-success-moment

---

## 13. Micro Copy

### Buttons

| Context | Label |
|---------|-------|
| Primary dashboard | Open Dashboard |
| Create project | Start New Project |
| Run validation | Run Validation |
| Generate doc | Generate with AI |
| View evidence | View Evidence |

Avoid: Submit, OK, Save Changes (unless editing)

### Status chips

| State | Label |
|-------|-------|
| Ready | Ready |
| In progress | In Progress |
| Generating | Generating… |
| Completed | Completed |
| Insufficient | Needs Data |

### Breadcrumb

```
Workspace > {Project Name} > {Screen}
```

Never: Home > Module > Sub-module > List

### Score labels

- Startup Readiness (not "Validation Score" in hero)
- Funding Probability
- Top {n}%
- Grade {A–F}

---

## 14. Design Principles

1. **Trust through restraint** — White space, few colors, no clutter.
2. **Typography is hierarchy** — Numbers are the hero.
3. **Premium SaaS, not admin** — If it looks like internal tooling, redesign.
4. **AI is visible** — Purple accent, "AI Recommendation" eyebrow, verdict badges.
5. **Consulting, not chat** — Structured insight blocks, not message bubbles (except AI Consultant screen).
6. **Progressive disclosure** — Summary → detail → raw data.
7. **One primary action per section** — Reduce choice paralysis.

---

## 15. Accessibility Principles

- Contrast: WCAG AA minimum for all text
- Focus states: visible ring on interactive elements
- Motion: respect `prefers-reduced-motion` — disable count-up and slide-in
- Screen readers: verdict and score announced before table content
- Touch targets: 44px minimum on mobile
- Color never sole indicator — GO/HOLD also uses text label

---

## 16. Motion Principles

Motion communicates **change** and **progress**, not decoration.

| Element | Motion |
|---------|--------|
| Page enter | Fade 300ms |
| Hero numbers | Count-up 800ms (reduced-motion: instant) |
| KPI rings | Stroke animate 600ms |
| Card hover | Lift 2px, 200ms |
| Score increase | Brief highlight pulse on delta |
| Generating | Amber pulse dot |

**Forbidden:** Bounce, parallax, infinite animations, confetti.

---

## 17. AI Summary Rule

**Every intelligence screen has an AI Summary at the top** (below page title, above metrics).

### Required fields

- Verdict badge (GO / REVIEW / HOLD)
- Star rating (when data sufficient)
- Funding Probability or readiness % (when applicable)
- 3-line narrative (Persona: LaunchLens AI)
- Confidence indicator

### When data insufficient

Do not fake GO. Show HOLD/REVIEW with explicit gap:

> "Insufficient validation data. Complete research, VOC, and evidence collection to unlock AI recommendations."

### Order on page

```
AI Summary  ← always first content block
Everything else
Table       ← always last
```

---

## 18. Action Center Rule

**Purpose:** Convert insight into behavior. Bridge from "know" to "do."

### Each action row shows

| Field | Example |
|-------|---------|
| Priority | Priority 1 |
| Title | VOC 인터뷰 15건 확보 |
| Impact | +8 score |
| Time | ~2 days |
| Status | HIGH / Pending |

### Rules

- Max 3 visible priorities
- Sorted by impact on readiness
- Completed → celebrate briefly, remove from list
- Every row links to **one** destination (no dead ends)
- Empty (all complete): emerald success state — "All priority actions completed"

---

## 19. Dashboard Rule

Dashboard is **not** a feature launcher. Dashboard is the **command center**.

### Required sections (in order)

1. Hero — Readiness number, Grade, Decision, Ranking
2. AI Executive Summary
3. KPI rings (Startup, Investment, Grant, AI Confidence)
4. Decision Analysis (insights + reasoning)
5. Action Center
6. Analytics (Radar, Risk, Breakdown)
7. Timeline
8. Expert Opinions

### Forbidden on Dashboard

- Feature grid as primary content
- Raw tables above fold
- "Quick links" to every module
- Validation checklist UI as hero

### Dashboard answers in 10 seconds

1. How ready am I? → **84, Grade A**
2. Should I proceed? → **GO**
3. What next? → **Action Center row 1**

---

## 20. Future Vision

### Phase 1 (now — MVP+)

Decision-first intelligence platform. Template-based AI Summary from existing data. Premium SaaS shell.

### Phase 2

Real LLM-generated summaries and expert opinions. Personalized action impact modeling. Investor share links.

### Phase 3

Multi-project portfolio view for accelerators. Benchmark against anonymized cohort ("Top 12%" becomes live peer data).

### Phase 4

Live AI Co-Founder — proactive alerts ("Competitor X raised Series A — review positioning").

### North star

> **Every founder makes startup decisions with the same rigor as a top-tier VC — in minutes, not months.**

---

## Appendix A — Screen Intent (Experience, not Layout)

| Screen | User arrives asking… | Experience must deliver… |
|--------|---------------------|---------------------------|
| Landing | "What is this?" | Premium brand, intelligence promise, enter workspace |
| Dashboard | "Am I ready?" | Score, verdict, next action |
| Project | "How is this idea doing?" | Workspace overview, progress, module health |
| Evidence | "Why do you trust this?" | Confidence, categories, cards → table |
| VOC | "Do customers care?" | Pain severity, intent, interviews |
| Competitors | "Who else?" | BCG positioning, differentiation |
| Government | "Can I get funding?" | Fit, deadline, amount |
| AI Studio | "Give me deliverables" | Document status, generate, export |
| AI Consultant | "Let me ask" | Conversational advisor with context |

**Research screen:** User asks "What should I investigate?" — supporting role, never primary entry.

---

## Appendix B — Persona → Copy Key Mapping (i18n)

| Persona | i18n prefix |
|---------|-------------|
| LaunchLens AI | `intelligence.summary.*` |
| VC | `intelligence.expert.vc.*` |
| PM | `intelligence.expert.pm.*` |
| CTO | `intelligence.expert.cto.*` |
| Marketing | `intelligence.expert.marketing.*` |

All AI-facing copy must pass persona check before merge.

---

## Appendix C — Implementation Gate (for Cursor)

Before any UI sprint (Design 5.1+), verify:

- [ ] Read this Bible
- [ ] Screen intent matches Appendix A
- [ ] Decision First order enforced
- [ ] AI Summary present
- [ ] Table is last
- [ ] Persona tone in copy
- [ ] Success moment path exists
- [ ] Design System tokens applied

**If Bible and Design System conflict, Bible wins on experience; Design System wins on pixels.**

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-07-20 | Initial Product Experience Bible — Sprint PX 1.0 |

---

**Next:** PM Design Review → Sprint Design 5.1 (Shell + Dashboard rebuild per Bible + Design System)
