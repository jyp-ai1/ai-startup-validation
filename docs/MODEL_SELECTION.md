# Model Selection Guide

Reference for choosing models from `@repo/ai` ModelRegistry.

---

## Model Catalog

### Chat Models

| Model ID | Provider | Context | Tools | Vision | Best For |
|----------|----------|---------|-------|--------|----------|
| `gpt-4o` | OpenAI | 128K | ✅ | ✅ | General purpose, production |
| `claude-sonnet-4-20250514` | Anthropic | 200K | ✅ | ✅ | Long context, analysis |
| `gemini-2.0-flash` | Google | 1M | ✅ | ✅ | Large context, fast |
| `openrouter/auto` | OpenRouter | 128K | ✅ | ❌ | Multi-model routing |
| `gpt-4o-azure` | Azure | 128K | ✅ | ✅ | Enterprise compliance |
| `llama3.2` | Ollama | 128K | ❌ | ❌ | Local development |

### Embedding Models

| Model ID | Provider | Dimensions | Best For |
|----------|----------|------------|----------|
| `text-embedding-3-small` | OpenAI | 1536 | Production RAG |
| `gemini-embedding-001` | Google | 768 | Cost-effective embeddings |

### Specialized Models

| Model ID | Kind | Provider | Use Case |
|----------|------|----------|----------|
| `o1` | reasoning | OpenAI | Complex reasoning tasks |
| `gpt-4o-audio` | audio | OpenAI | Audio input/output |
| `dall-e-3` | image | OpenAI | Image generation |

---

## Selection Decision Tree

```
Need local/offline?
  └─ Yes → ollama/llama3.2
  └─ No
      Need 1M+ context?
        └─ Yes → google/gemini-2.0-flash
        └─ No
            Need enterprise compliance?
              └─ Yes → azure-openai/gpt-4o-azure
              └─ No
                  Need best reasoning?
                    └─ Yes → openai/o1
                    └─ No → openai/gpt-4o (default)
```

---

## Querying the Registry

```typescript
import { modelRegistry } from '@repo/ai';

// By ID
const model = modelRegistry.get('gpt-4o');

// By provider
const openaiModels = modelRegistry.listByProvider('openai');

// By kind
const chatModels = modelRegistry.listByKind('chat');
const embeddingModels = modelRegistry.listByKind('embedding');

// Typed getters
const chatModel = modelRegistry.getChatModel('gpt-4o');
const embedModel = modelRegistry.getEmbeddingModel('text-embedding-3-small');
```

---

## Registering Custom Models

```typescript
modelRegistry.register({
  id: 'my-fine-tuned-model',
  name: 'My Fine-Tuned Model',
  provider: 'openai',
  kind: 'chat',
  contextWindow: 16_384,
  maxOutputTokens: 4096,
  supportsStreaming: true,
  supportsTools: true,
  supportsVision: false,
});
```

---

## Environment Defaults

```env
AI_DEFAULT_PROVIDER=openai
AI_DEFAULT_MODEL=gpt-4o
```

```typescript
import { aiEnv } from '@repo/ai';

const model = aiEnv.AI_DEFAULT_MODEL ?? 'gpt-4o';
```

---

## Recommendations by Use Case

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| Chat UI | `gpt-4o` | Balance of speed, quality, tools |
| Document Q&A | `gemini-2.0-flash` | 1M context window |
| Code generation | `claude-sonnet-4-20250514` | Strong coding performance |
| Local dev/testing | `llama3.2` (Ollama) | No API cost |
| Embeddings/RAG | `text-embedding-3-small` | Cost-effective, proven |
| Complex reasoning | `o1` | Dedicated reasoning model |
| Cost-sensitive | `gemini-2.0-flash` | Lower per-token cost |

---

## Model Capabilities Matrix

| Capability | gpt-4o | claude-sonnet-4 | gemini-2.0-flash | llama3.2 |
|------------|:------:|:---------------:|:----------------:|:--------:|
| Streaming | ✅ | ✅ | ✅ | ✅ |
| Tool calling | ✅ | ✅ | ✅ | ❌ |
| Vision | ✅ | ✅ | ✅ | ❌ |
| JSON mode | ✅ | ✅ | ✅ | ❌ |
| 100K+ context | ✅ | ✅ | ✅ | ✅ |

---

## Future

- Dynamic model discovery from provider APIs
- Model performance benchmarks in observability
- Auto-routing based on task type and cost budget
