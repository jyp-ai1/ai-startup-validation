# Google OAuth QA Checklist — Sprint 5 Epic A (Release Blocker)

**Prod:** https://ai-startup-validation-tau.vercel.app  
**Sprint:** 5 — Closed Alpha Launch  
**Exit:** Google Login 관련 버그 **0건**

---

## Automated pre-checks (Cursor)

- [ ] `/auth/login?error=cancelled` → 200 + cancelled i18n alert
- [ ] `/auth/login?error=session` → 200 + session error alert
- [ ] `/auth/callback` — `access_denied` → cancelled redirect
- [ ] `/auth/callback` — success → `?auth=complete` or workspace

---

## Core flows (each browser)

| # | Scenario | Chrome | Safari | Edge | Firefox | Mobile Safari | Android Chrome |
|---|----------|--------|--------|------|---------|---------------|----------------|
| 1 | Landing → Sign in → Google → Workspace | | | | | | |
| 2 | Demo → Login → Draft promoted (same content) | | | | | | |
| 3 | Logout → session cleared | | | | | | |
| 4 | Re-login → same projects, no duplicate | | | | | | |
| 5 | **Refresh (F5) — MUST NOT logout** | | | | | | |
| 6 | New tab — still authenticated | | | | | | |
| 7 | OAuth cancel → cancelled message | | | | | | |
| 8 | Locale `/ko/` preserved through redirect | | | | | | |
| 9 | 1 project → auto-enter project workspace | | | | | | |
| 10 | N projects → project list shown | | | | | | |

---

## Returning user (A-4)

- [ ] Second visit shows continuity copy (new competitors / continue review)
- [ ] Morning Report state from DB, not empty mock
- [ ] Next Action visible

---

## Regression after any auth change

Run rows **5–6** on Chrome + Safari minimum before merging.

---

## Sign-off

| Role | PASS / HOLD | Date | Notes |
|------|-------------|------|-------|
| PM | | | |
| Cursor (automated) | | | lint + build + pre-checks |

**HOLD criteria:** Any refresh logout · draft data loss · routing loop · locale drop
