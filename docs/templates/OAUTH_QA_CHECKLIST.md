# Google OAuth QA Checklist — PM Manual (L3.4 RC Gate)

Prod: https://ai-startup-validation-tau.vercel.app

## Automated pre-checks (Cursor 2026-07-24)

- [x] `/auth/login?error=cancelled` → 200 + cancelled i18n alert
- [x] `/auth/login?error=session` → 200 + session error alert
- [x] `/auth/callback` routes: `access_denied` → `cancelled`, success → `?auth=complete`

## Flow (PM manual)

- [ ] Landing → Sign in → Google consent → Dashboard
- [ ] New user: first login creates session
- [ ] Logout → redirected / session cleared
- [ ] Re-login → Dashboard without error
- [ ] Refresh page → session persists
- [ ] New tab → still authenticated
- [ ] Cancel OAuth → login page shows cancelled message
- [ ] Invalid/expired callback → session error message

## Devices

- [ ] Desktop Chrome
- [ ] Desktop Edge
- [ ] Mobile Safari (390px)
- [ ] Mobile Chrome (430px)

## Sign-off

| Role | PASS/HOLD | Date | Notes |
|------|-----------|------|-------|
| PM | | | |
| QA | | | |
