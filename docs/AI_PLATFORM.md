# AI Platform

Sprint 5 introduces `@repo/ai` — a **provider-agnostic AI Platform** that hides LLM SDKs behind adapter interfaces.

> **Design principle:** Applications never import OpenAI, Anthropic, or any LLM SDK. They use `ChatService.chat()` and the unified platform API.

---

## Architecture

```
Application (apps/web)
        ↓
AI Service (ChatService)
        ↓
Provider Registry + Model Registry
        ↓
Prompt Manager
        ↓
Provider Adapter (port)
        ↓
OpenAI · Claude · Gemini · OpenRouter · Azure · Ollama
```

### Package Location

```
packages/ai/src/
├── providers/       ProviderRegistry, adapter ports, 6 provider stubs
├── models/          ModelRegistry (Chat, Embedding, Vision, Reasoning, Audio, Image)
├── prompts/         PromptManager — templates, variables, versioning
├── chat/            ChatService — chat(), stream(), complete(), generateObject(), generateJSON()
├── streaming/       Unified stream interface
├── tools/           ToolRegistry, ToolExecutor
├── embeddings/      Interface only
├── rag/             Retriever interface only
├── memory/          Conversation/Session/Summarization ports
├── observability/   Latency, tokens, cost, errors, retries
├── token/           Token estimation and pricing
├── cache/           ResponseCache port
├── middleware/      Retry, rate limiting
└── index.ts         createAIPlatform(), getAIPlatform()
```

### App Wiring

```typescript
// apps/web/lib/ai/platform.ts
import { ai, chat, stream } from '@/lib/ai/platform';

const response = await chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

---

## AI SDK Policy

**Do NOT lock the project to Vercel AI SDK.**

Adapter interfaces support future implementations using:

| Framework | Role |
|-----------|------|
| `native` | Direct provider SDK (default stub adapters) |
| `ai-sdk` | Vercel AI SDK adapter (future) |
| `langchain` | LangChain adapter (future) |
| `llamaindex` | LlamaIndex adapter (future) |

Applications never know which framework is used — only the `AIProviderPort` interface.

---

## Core APIs

### ChatService

| Method | Purpose |
|--------|---------|
| `chat(request)` | Unified chat completion |
| `stream(request)` | Streaming response |
| `complete(request)` | Text completion |
| `generateJSON(request)` | Structured JSON output |
| `generateObject<T>(request)` | Schema-validated object |

### Provider Registry

```typescript
import { providerRegistry } from '@repo/ai';

providerRegistry.create('openai', { apiKey: process.env.OPENAI_API_KEY });
providerRegistry.register(customProvider);  // dynamic registration
```

Supported providers: `openai`, `anthropic`, `google`, `openrouter`, `azure-openai`, `ollama`

### Model Registry

```typescript
import { modelRegistry } from '@repo/ai';

const model = modelRegistry.get('gpt-4o');
const embeddings = modelRegistry.listByKind('embedding');
```

### Prompt Manager

```typescript
import { promptManager } from '@repo/ai';

promptManager.register({
  id: 'support-agent',
  name: 'Support Agent',
  system: 'You help users of {{product}}.',
  user: 'Question: {{question}}',
});

const { messages } = promptManager.render('support-agent', {
  product: 'Acme',
  question: 'How do I reset my password?',
});
```

### Tool Calling

```typescript
import { toolRegistry, toolExecutor } from '@repo/ai';

toolRegistry.register({
  name: 'search_docs',
  description: 'Search documentation',
  parameters: { type: 'object', properties: { query: { type: 'string' } } },
  handler: async (args) => searchDocs(args.query as string),
});
```

---

## Feature Maturity

| Feature | Status | Tier |
|---------|--------|------|
| Provider Registry | ✅ Implemented (stub adapters) | Must Have |
| Model Registry | ✅ Implemented | Must Have |
| Chat API | ✅ Implemented | Must Have |
| Streaming | ✅ Implemented | Must Have |
| Prompt Manager | ✅ Implemented | Must Have |
| Tool Calling | ✅ Implemented | Must Have |
| Observability | ✅ Implemented | Must Have |
| Token/Cost tracking | ✅ Implemented | Must Have |
| Embeddings | 🔶 Interface only | Should Have |
| RAG | 🔶 Interface only | Future |
| Memory | 🔶 Interface only | Future |
| Response Cache | ✅ In-memory impl | Should Have |
| Real SDK adapters | 🔜 Future sprint | Must Have |

---

## Environment Variables

Optional until providers are configured:

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
OPENROUTER_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
OLLAMA_BASE_URL=http://localhost:11434
AI_DEFAULT_PROVIDER=openai
AI_DEFAULT_MODEL=gpt-4o
```

---

## Related Documentation

- [LLM_ARCHITECTURE.md](./LLM_ARCHITECTURE.md) — Layer diagram and adapter pattern
- [PROMPT_ENGINEERING.md](./PROMPT_ENGINEERING.md) — Template conventions
- [MODEL_SELECTION.md](./MODEL_SELECTION.md) — Model catalog and selection guide
- [COST_MANAGEMENT.md](./COST_MANAGEMENT.md) — Token and cost tracking

See also: [AUTH_PLATFORM.md](./AUTH_PLATFORM.md) for authorization integration patterns.
