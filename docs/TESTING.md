# Testing

Testing strategy for the AI SaaS Starter Kit. Test runner to be added in a future sprint.

---

## Philosophy

- Test behavior, not implementation
- Mock at adapter boundaries (repository, AI provider)
- No production DB in tests
- Pure utils should have 100% unit coverage when test runner lands

---

## Layers

| Layer | Test type | Location |
|-------|-----------|----------|
| `@repo/utils` | Unit | `*.test.ts` colocated |
| `@repo/core` | Unit | validation, response helpers |
| Services | Unit + mock repos | `packages/*/src/**/*.test.ts` |
| Repositories | Integration | mock adapter or test DB |
| API routes | Integration | `apps/web/app/api/**/*.test.ts` |
| UI | Component | React Testing Library (future) |
| E2E | Playwright | `e2e/` (backlog) |

---

## Conventions

```typescript
// File naming
user-service.test.ts
format-relative-time.test.ts

// Structure
describe('UserService', () => {
  it('throws NotFoundError when user missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getUser('x')).rejects.toThrow(NotFoundError);
  });
});
```

---

## Running Tests (Future)

```bash
pnpm test           # all packages
pnpm test:unit      # unit only
pnpm test:e2e       # e2e only
```

Not yet configured — tracked in BACKLOG B-024.

---

## CI (Future)

```yaml
# Planned: lint → typecheck → test → build
```

---

## Related

- `.cursor/rules/testing.mdc`
- [CODING_GUIDE.md](./CODING_GUIDE.md)
