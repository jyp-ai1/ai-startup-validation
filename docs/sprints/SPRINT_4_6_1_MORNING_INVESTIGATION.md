# Sprint 4.6.1 — Morning Investigation & Smart Questions

**Status:** ✅ SHIPPED  
**Mission:** "AI PM이 내가 출근하기 전에 일을 끝내놨다" — 조사 일지가 아니라 **아침 업무 보고** 경험.

---

## CPO Direction

Investigation Log is good but still feels like a list. Need:

- Morning briefing before judgment
- Daily Report timeline (08:00 → 08:12)
- Work journal entries with findings
- Work progress bar (8/10)
- Discoveries since yesterday
- Smart Question 2.0 (gap-only, button flow, price level)
- Investigation schedule (login hook)

---

## P0 Deliverables

| # | Item | Status |
|---|------|--------|
| P0-1 | Morning Investigation brief | ✅ |
| P0-2 | Investigation schedule settings (Profile) | ✅ |
| P0-3 | Daily Report timeline | ✅ |
| P0-4 | Smart Question 2.0 + price flow | ✅ |
| P0-5 | Investigation Log 2.0 (findings + duration) | ✅ |
| P0-6 | Google Login value prop + schedule preview | ✅ |
| P0-7 | Work progress bar | ✅ |
| P0-8 | Discoveries since yesterday | ✅ |

---

## Implementation map

| Layer | File |
|-------|------|
| Types | `v2-investigation-types.ts` |
| Engine | `v2-investigation-engine.ts` |
| Morning brief | `v2-morning-investigation-brief.tsx` |
| Daily timeline | `v2-daily-report-timeline.tsx` |
| Work log | `v2-investigation-log.tsx` (workJournal) |
| Progress | `v2-investigation-progress.tsx` |
| Discoveries | `v2-investigation-discoveries.tsx` |
| Schedule | `v2-investigation-schedule-settings.tsx` |
| Settings page | `settings-investigation-section.tsx` |
| Smart intake | `v2-smart-intake-flow.tsx` (gap → model → price) |
| Demo | `v2-demo-experience.tsx` |

---

## Exit criteria

- Inbox opens with "출근 전 조사 완료" briefing + progress + timeline
- Log entries show finding + insight + duration
- Questions only for document gaps; pricing uses button flow
- Login CTA explains Morning Report + schedule setting
