# Feature Template

> Copy to `docs/features/FEATURE_NAME.md` for mid-size features.

---

## Feature: [Name]

**Sprint:** N  
**Status:** Planned | In Progress | Done  
**BACKLOG ID:** B-XXX

---

## Summary

One paragraph description.

---

## User Impact

Who benefits and how?

---

## Technical Approach

### Packages

| Package | Changes |
|---------|---------|
| `@repo/ui` | |
| `@repo/core` | |
| `apps/web` | |

### Layer Flow

```
Route → Service → Repository → Adapter
```

---

## Files (Expected)

```text
packages/.../new-file.ts
apps/web/app/.../route.ts
docs/API.md (updated)
```

---

## Testing Plan

- [ ] Unit:
- [ ] Integration:
- [ ] Manual:

---

## Rollout

- [ ] Docs updated
- [ ] Env vars in `.env.example`
- [ ] TASKS.md marked done

---

## Related

- PRD: [link]
- ADR: [link]
