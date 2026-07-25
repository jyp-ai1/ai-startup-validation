# LaunchLens Mission Mode v5

**Start:** autonomous · **End condition:** Mission Queue empty · **Morning read:** 08:00 KST Production only

## Rule

Autonomous = **consume Roadmap until Mission Queue is empty** — not "finish one task and report."

- No questions · No approval wait · No mid-mission reports to PM
- Each Mission: Dev → QA → Deploy → Smoke → Regression → Production → **Next Mission**
- PM/CPO reads morning Daily Report only; does not block

## Forbidden output

PASS/FAIL 부탁 · 검토/승인 부탁 · 진행/배포/커밋할까요 · Preview 확인 · PM 판단 대기

## Daily Report (08:00 only)

See `docs/templates/DAILY_AUTONOMOUS_REPORT.md` — ends with Mission completion rate + next Mission, not questions.

## Principles

> 사용자가 체감하지 못하는 기능은 만들지 않는다.  
> 사용자가 생각해야 하는 순간을 제거한다.  
> AI는 답변하는 도구가 아니라 프로젝트를 이끄는 PM이다.
