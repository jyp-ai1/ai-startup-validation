'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';

import { Button, Input, PageHeader, Textarea } from '@repo/ui';

export function AiPlaygroundDashboard() {
  const [systemPrompt, setSystemPrompt] = useState(
    'You are LaunchLens AI playground. Answer concisely.',
  );
  const [question, setQuestion] = useState('What should we validate first?');
  const [temperature, setTemperature] = useState('0.5');
  const [maxTokens, setMaxTokens] = useState('512');
  const [promptVersion, setPromptVersion] = useState<'v1' | 'v2' | 'v3'>('v1');
  const [output, setOutput] = useState('');
  const [meta, setMeta] = useState('');
  const [pending, startTransition] = useTransition();

  function handleRun(streamMode: boolean) {
    startTransition(async () => {
      setOutput('');
      setMeta('');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `${systemPrompt}\n\nUser: ${question}`,
          projectTitle: 'AI Playground',
          stream: streamMode,
          promptVersion,
          temperature: Number(temperature),
          maxTokens: Number(maxTokens),
        }),
      });

      if (streamMode && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let text = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as { delta?: string };
              if (parsed.delta) {
                text += parsed.delta;
                setOutput(text);
              }
            } catch {
              /* ignore */
            }
          }
        }
        setMeta('stream complete');
        return;
      }

      const json = (await response.json()) as {
        data?: { answer?: string; latencyMs?: number; usage?: { totalTokens?: number } };
      };
      setOutput(json.data?.answer ?? 'No response');
      setMeta(
        `latency=${json.data?.latencyMs ?? 0}ms tokens=${json.data?.usage?.totalTokens ?? 0}`,
      );
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Playground"
        description="Admin-only prompt testing for OpenRouter + Gemini Flash."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
          <label className="space-y-2 text-sm">
            <span className="font-medium">System prompt</span>
            <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">User question</span>
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Temperature</span>
              <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span>Max tokens</span>
              <Input value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span>Prompt version</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={promptVersion}
                onChange={(e) => setPromptVersion(e.target.value as 'v1' | 'v2' | 'v3')}
              >
                <option value="v1">v1</option>
                <option value="v2">v2</option>
                <option value="v3">v3</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => handleRun(false)}>
              <Sparkles className="size-4" />
              Run
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => handleRun(true)}>
              Stream
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-5">
          <p className="text-sm font-medium">Output</p>
          <pre className="min-h-[280px] whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm">
            {output || '—'}
          </pre>
          {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}
