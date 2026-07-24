# Google OAuth QA Checklist — PM Manual (L3.4 RC Gate)

Prod: https://ai-startup-validation-tau.vercel.app

## Flow

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
