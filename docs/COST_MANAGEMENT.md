# Cost Management

Token tracking, cost estimation, and budget controls in `@repo/ai`.

---

## Token Manager

```typescript
import { tokenManager } from '@repo/ai';

// Estimate tokens from text
const tokens = tokenManager.estimateTokens('Hello, world!');

// Estimate usage from input/output
const usage = tokenManager.estimateUsage(inputText, outputText);

// Estimate cost in USD
const cost = tokenManager.estimateCostUsd('gpt-4o', usage);
```

---

## Default Pricing (USD per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| claude-sonnet-4-20250514 | $3.00 | $15.00 |
| gemini-2.0-flash | $0.10 | $0.40 |
| text-embedding-3-small | $0.02 | $0.00 |
| llama3.2 (Ollama) | $0.00 | $0.00 |

Update pricing as vendors change rates:

```typescript
tokenManager.setPricing('gpt-4o', { inputPer1M: 2.5, outputPer1M: 10 });
```

---

## Observability Tracking

Every ChatService call records:

| Metric | Field |
|--------|-------|
| Provider | `event.provider` |
| Model | `event.model` |
| Operation | `chat`, `stream`, `complete`, etc. |
| Latency | `event.latencyMs` |
| Input tokens | `event.usage.inputTokens` |
| Output tokens | `event.usage.outputTokens` |
| Total tokens | `event.usage.totalTokens` |
| Estimated cost | `event.estimatedCostUsd` |
| Success | `event.success` |
| Retries | `event.retries` |
| Error | `event.error` |

```typescript
import { observabilityTracker } from '@repo/ai';

const stats = observabilityTracker.getStats();
// { totalRequests, successRate, totalTokens, totalCostUsd, avgLatencyMs, byProvider }
```

Subscribe to events:

```typescript
observabilityTracker.subscribe((event) => {
  console.log(`${event.model}: ${event.usage.totalTokens} tokens, $${event.estimatedCostUsd.toFixed(4)}`);
});
```

---

## Budget Controls

```typescript
import { isWithinBudget } from '@repo/ai';

const budget = {
  maxInputTokens: 4000,
  maxOutputTokens: 1000,
  maxTotalTokens: 5000,
};

if (!isWithinBudget(response.usage, budget)) {
  throw new TokenLimitError(budget.maxTotalTokens, response.usage.totalTokens);
}
```

---

## Cost Optimization Strategies

### 1. Model Tiering

```
Simple tasks  → gemini-2.0-flash ($0.10/1M input)
Complex tasks → gpt-4o ($2.50/1M input)
Reasoning     → o1 (premium)
```

### 2. Response Caching

```typescript
const chat = new ChatService({ enableCache: true });
// Identical requests return cached response — zero API cost
```

### 3. Token Estimation Before Call

```typescript
const estimated = tokenManager.estimateTokens(prompt);
if (estimated > 8000) {
  // Truncate, summarize, or split
}
```

### 4. Local Development

Use Ollama (`llama3.2`) for development — zero API cost.

---

## Per-Provider Cost Breakdown

```typescript
const stats = observabilityTracker.getStats();
console.log(stats.byProvider);
// {
//   openai: { count: 150, tokens: 450000, cost: 2.35 },
//   anthropic: { count: 30, tokens: 120000, cost: 1.80 },
// }
```

---

## Retry Cost Awareness

`withRetry` middleware tracks retry count in observability events. Each retry may incur additional token costs — monitor `event.retries` in production.

---

## Future Enhancements

- [ ] Per-organization cost budgets
- [ ] Cost alerts and webhooks
- [ ] Persistent cost analytics in database
- [ ] Real-time pricing sync from provider APIs
- [ ] Cost allocation by feature/project tag
