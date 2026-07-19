# Prompt Engineering Guide

Conventions for using `@repo/ai` PromptManager in this Starter Kit.

---

## Prompt Template Structure

Each template supports three role-specific sections:

| Role | Purpose |
|------|---------|
| `system` | Persona, rules, constraints |
| `developer` | API-level instructions (OpenAI developer role) |
| `user` | User-facing template with variables |

```typescript
promptManager.register({
  id: 'code-reviewer',
  name: 'Code Reviewer',
  version: '1.0.0',
  system: `You are a senior engineer reviewing {{language}} code.
Be concise. Focus on bugs, security, and performance.`,
  user: `Review this code:\n\`\`\`{{language}}\n{{code}}\n\`\`\``,
});
```

---

## Variables

Use `{{variableName}}` syntax. Variables are auto-extracted on registration.

```typescript
const vars = extractVariables('Hello {{name}}, welcome to {{product}}');
// ['name', 'product']
```

Render with values:

```typescript
const { messages } = promptManager.render('greeting', {
  name: 'Alice',
  product: 'Acme SaaS',
});
// → [{ role: 'system', content: '...' }, { role: 'user', content: '...' }]
```

---

## Versioning

Templates support multiple versions per ID:

```typescript
promptManager.register({ id: 'agent', name: 'Agent', user: 'v1 prompt', version: '1.0.0' });
promptManager.register({ id: 'agent', name: 'Agent', user: 'v2 prompt', version: '2.0.0' });

promptManager.get('agent');           // latest (2.0.0)
promptManager.get('agent', '1.0.0');  // specific version
promptManager.list('agent');          // all versions
```

**Convention:** Bump version when changing prompt behavior. Keep old versions for A/B testing and rollback.

---

## Best Practices

### 1. Separate System from User Content

```typescript
// ✅ Good — system rules isolated
system: 'You never reveal internal API keys.',
user: '{{userQuestion}}',

// ❌ Avoid — mixing rules with user input
user: 'Never reveal keys. User asks: {{userQuestion}}',
```

### 2. Use Descriptive Template IDs

```
support-agent-v1     ✅
prompt1              ❌
```

### 3. Tag Templates

```typescript
promptManager.register({
  id: 'summarizer',
  name: 'Document Summarizer',
  tags: ['rag', 'summarization', 'internal'],
  user: 'Summarize: {{document}}',
});
```

### 4. Chain with ChatService

```typescript
const { messages } = promptManager.render('support-agent', {
  product: 'Acme',
  question: userInput,
});

const response = await chat({ model: 'gpt-4o', messages });
```

---

## Prompt Categories (Recommended)

| Category | Template ID Pattern | Example |
|----------|---------------------|---------|
| Support | `support-*` | `support-agent` |
| Code | `code-*` | `code-reviewer`, `code-generator` |
| Content | `content-*` | `content-blog-post` |
| Analysis | `analysis-*` | `analysis-sentiment` |
| RAG | `rag-*` | `rag-answer-with-context` |

---

## Structured Output Prompts

For `generateJSON()` and `generateObject()`:

```typescript
// generateJSON — model returns JSON object
const result = await ai.chat.generateJSON({
  model: 'gpt-4o',
  messages: promptManager.render('extract-entities', { text }).messages,
});

// generateObject — schema-validated
const result = await ai.chat.generateObject<{ name: string; age: number }>({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'John is 30' }],
  schema: {
    type: 'object',
    properties: { name: { type: 'string' }, age: { type: 'number' } },
  },
});
```

---

## Anti-Patterns

| Anti-pattern | Why |
|--------------|-----|
| Hardcoding prompts in service files | No versioning, no reuse |
| String concatenation for variables | Use `{{var}}` interpolation |
| One giant system prompt | Split into composable templates |
| Ignoring version on breaking changes | Silent behavior changes in production |

---

## Future Enhancements

- [ ] Prompt template storage in database
- [ ] A/B testing framework
- [ ] Prompt evaluation metrics (latency, token cost per template)
- [ ] Integration with observability dashboard
