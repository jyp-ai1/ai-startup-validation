# Session Management

Browser session and cookie management in `@repo/browser`.

---

## Context Options

```typescript
await contextManager.createContext(browser, {
  persistent: false,      // future: userDataDir
  incognito: true,        // default new context
  mobile: false,          // mobile viewport
  locale: 'ko-KR',
  timezone: 'Asia/Seoul',
  viewport: { width: 1280, height: 720 },
  storageStatePath: '/path/to/state.json',  // restore session
});
```

---

## Cookie Manager

```typescript
import { CookieManager } from '@repo/browser';

const cookies = new CookieManager('.browser-temp/cookies');

// Save session after login
await cookies.save(context, 'naver-session');

// Load for next run
const statePath = await cookies.load('naver-session');
const context = await contextManager.createContext(browser, {
  storageStatePath: statePath,
});

// Export/import for CI or team sharing
cookies.export('naver-session');
cookies.import('naver-session', '/backup/cookies.json');

await cookies.clear(context);
```

---

## Naver Login Automation (Sprint 11)

Future flow:

1. Launch browser with persistent context
2. Navigate to Naver login
3. Complete authentication (manual or automated)
4. `cookies.save(context, 'naver-prod')`
5. Subsequent jobs load saved state — no re-login

---

## Browser Pool Sessions

```typescript
const manager = await browserPool.acquire();
try {
  // use browser
} finally {
  browserPool.release(manager);
}
```

Pool evicts idle browsers after 60s (configurable).
