# LLM Architecture

Deep dive into the `@repo/ai` adapter architecture and data flow.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  apps/web                                                    │
│  lib/ai/platform.ts · lib/ai/helpers.ts                     │
│  Never imports openai, @anthropic-ai/sdk, @google/generative-ai│
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  @repo/ai — AI Platform                                      │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ ChatService │  │PromptManager │  │ Observability    │  │
│  └──────┬──────┘  └──────────────┘  └──────────────────┘  │
│         │                                                    │
│  ┌──────▼──────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ModelRegistry│  │ProviderRegistry│ │ TokenManager    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────────────┘  │
│         │                 │                                  │
│  ┌──────▼─────────────────▼──────────────────────────────┐  │
│  │              AIProviderPort (interface)                │  │
│  │  chat() · stream() · complete() · embed?()            │  │
│  └──────┬────────────────────────────────────────────────┘  │
│         │                                                    │
│  ┌──────▼────────────────────────────────────────────────┐  │
│  │  Adapter Implementations (hidden from apps)            │  │
│  │  native · ai-sdk · langchain · llamaindex (future)    │  │
│  └──────┬────────────────────────────────────────────────┘  │
└─────────┼───────────────────────────────────────────────────┘
          │
    ┌─────┴─────┬─────────┬─────────┬─────────┐
    ▼           ▼         ▼         ▼         ▼
 OpenAI    Anthropic   Gemini  OpenRouter  Ollama
```

---

## Request Flow

### Chat Request

```
1. App calls chat({ model: 'gpt-4o', messages: [...] })
2. ChatService resolves model from ModelRegistry
3. ModelRegistry returns provider: 'openai'
4. ProviderRegistry.get('openai') → AIProviderPort
5. Provider.chat(request) → ChatResponse
6. ObservabilityTracker records latency, tokens, cost
7. Unified ChatResponse returned to app
```

### Streaming Request

```
1. App calls stream(request) or for-await loop
2. Same resolution as chat
3. Provider.stream(request) → AsyncIterable<StreamChunk>
4. Each chunk: { id, delta, done, usage?, finishReason? }
5. No provider-specific stream format leaks to app
```

---

## Adapter Pattern

### Port Interface

```typescript
interface AIProviderPort {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ModelKind[];
  readonly adapterFramework: 'native' | 'ai-sdk' | 'langchain' | 'llamaindex';

  isConfigured(): boolean;
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<StreamChunk>;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  embed?(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
```

### Why Adapters?

| Without adapters | With adapters |
|------------------|---------------|
| `import OpenAI from 'openai'` in every service | Single `@repo/ai` import |
| Provider swap = rewrite all services | Swap adapter registration |
| AI SDK version lock-in | Framework hidden behind port |
| Inconsistent error handling | Unified AIProviderError hierarchy |

---

## Provider Registry

Dynamic registration at startup or runtime:

```typescript
const platform = createAIPlatform();

// Auto-configured from env
platform.isProviderConfigured('openai');

// Manual registration
platform.providers.register(customProvider);
platform.providers.registerFactory('custom', (config) => new CustomAdapter(config));
```

Lazy initialization: `get('openai')` creates from factory if not yet instantiated.

---

## Model Registry

Models are metadata — they map `modelId → provider`:

```typescript
{
  id: 'gpt-4o',
  provider: 'openai',
  kind: 'chat',
  contextWindow: 128_000,
  supportsStreaming: true,
  supportsTools: true,
}
```

Model kinds: `chat`, `embedding`, `vision`, `reasoning`, `audio`, `image`

---

## Error Hierarchy

```
BaseError (@repo/core)
  └── AIProviderError
  └── ModelNotFoundError
  └── RateLimitError
  └── TokenLimitError
  └── SafetyError
  └── ProviderNotRegisteredError
```

All errors include structured `code`, `statusCode`, and optional `details`.

---

## Middleware Stack

```
Request
  → RateLimiter (optional)
  → withRetry (default: 3 retries, exponential backoff)
  → ResponseCache (optional)
  → Provider Adapter
  → ObservabilityTracker
Response
```

---

## Integration with Auth Platform

Combine AI calls with permission checks:

```typescript
import { requirePermission, PERMISSIONS } from '@repo/feature-auth';
import { chat } from '@/lib/ai/helpers';

export async function askAI(user: AuthDomainUser, question: string) {
  await requirePermission(user, PERMISSIONS.ANALYTICS_READ);
  return chat({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: question }],
  });
}
```

---

## Future: Real SDK Adapters

Sprint 5 ships **stub adapters** (no external SDK dependencies). Future sprints add:

```
packages/ai/src/providers/adapters/
├── openai.native.adapter.ts      ← openai SDK
├── openai.ai-sdk.adapter.ts      ← Vercel AI SDK
├── anthropic.native.adapter.ts
└── ...
```

Registration selects framework via `ProviderConfig.adapterFramework`.
