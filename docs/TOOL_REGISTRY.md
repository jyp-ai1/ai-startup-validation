# Tool Registry

Reference for `@repo/mcp` ToolRegistry and required ToolMetadata.

---

## ToolMetadata Schema

Every tool **must** include:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Unique identifier (`category.name`) |
| `name` | string | Human-readable name |
| `version` | semver | Tool version |
| `category` | string | Grouping (filesystem, playwright, etc.) |
| `description` | string | What the tool does |
| `permissions` | string[] | Required permissions to execute |
| `inputSchema` | ZodSchema | Input validation |
| `outputSchema` | ZodSchema | Output validation |
| `timeout` | number | Max execution time (ms) |
| `retryable` | boolean | Can retry on failure |
| `cacheable` | boolean | Can cache results |
| `tags` | string[] | Search tags |
| `capabilities` | string[] | Capability identifiers |

---

## Registering a Tool

```typescript
import { z } from 'zod';
import { mcp } from '@/lib/mcp/platform';

mcp.gateway.registerTool({
  id: 'content.generate',
  name: 'Generate Content',
  version: '1.0.0',
  category: 'content',
  description: 'Generate marketing content via AI',
  permissions: ['content.write', 'ai.chat'],
  inputSchema: z.object({
    topic: z.string(),
    tone: z.enum(['formal', 'casual']).optional(),
  }),
  outputSchema: z.object({
    title: z.string(),
    body: z.string(),
  }),
  timeout: 60_000,
  retryable: true,
  cacheable: false,
  tags: ['content', 'ai', 'marketing'],
  capabilities: ['content-generation'],
  handler: async (input, ctx) => {
    // Call @repo/ai ChatService
    return { title: '...', body: '...' };
  },
});
```

---

## Registry API

| Method | Purpose |
|--------|---------|
| `register(tool)` | Add tool |
| `unregister(id)` | Remove tool |
| `get(id)` | Get by ID (throws if missing) |
| `list()` | All registered tools |
| `listMetadata()` | Metadata only (no handlers) |
| `listByCategory(cat)` | Filter by category |
| `listByTag(tag)` | Filter by tag |
| `listByCapability(cap)` | Filter by capability |
| `search(query)` | Full-text search |
| `getCategories()` | Unique categories |
| `toMarkdown()` | Auto-generate documentation |

---

## Discovery & AI Recommendations

```typescript
// Search
mcp.discovery.tools.search('browser automation');

// Recommend for AI agent
mcp.discovery.tools.recommend('take screenshot of webpage', 3);

// List capabilities
mcp.discovery.capabilities.listAll();
```

---

## Permission Naming Convention

| Prefix | Domain |
|--------|--------|
| `fs.read` / `fs.write` | Filesystem |
| `browser.navigate` / `browser.interact` / `browser.capture` | Browser/Playwright |
| `github.read` / `github.write` | GitHub |
| `slack.write` | Slack |
| `discord.write` | Discord |
| `drive.read` / `drive.write` | Google Drive |
| `notion.read` / `notion.write` | Notion |
| `shell.execute` | Shell commands |
| `thinking.use` | Sequential thinking |

Align with `@repo/feature-auth` PERMISSIONS where possible.

---

## Auto-Generated Documentation

```typescript
const markdown = mcp.gateway.getToolDocumentation();
// → Markdown with categories, permissions, tags, capabilities
```

Use in admin UI, AI agent system prompts, or developer docs.

---

## Adapter Registration

Adapters bundle related tools:

```typescript
import { PlaywrightAdapter } from '@repo/mcp';

const adapter = new PlaywrightAdapter();
for (const meta of adapter.getToolDefinitions()) {
  const handler = adapter.createHandlers().get(meta.id)!;
  mcp.gateway.registerTool({ ...meta, handler });
}
```

Sprint 6 auto-registers all adapter stubs on platform creation.
