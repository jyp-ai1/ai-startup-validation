import type { ChatMessage } from '../types';
import { promptManager, type RenderedPrompt } from './manager';

export type PromptBuilderContext = {
  projectTitle?: string;
  projectSummary?: string;
  industry?: string;
  market?: string;
  evidence?: string;
  memory?: string;
  question?: string;
  tasks?: string;
  locale?: string;
};

function compactContext(ctx: PromptBuilderContext): string {
  const parts = [
    ctx.projectTitle ? `Project: ${ctx.projectTitle}` : null,
    ctx.industry ? `Industry: ${ctx.industry}` : null,
    ctx.projectSummary ? `Summary: ${ctx.projectSummary}` : null,
    ctx.market ? `Market: ${ctx.market}` : null,
    ctx.evidence ? `Evidence: ${ctx.evidence}` : null,
    ctx.memory ? `Memory: ${ctx.memory}` : null,
  ].filter(Boolean);

  return parts.join('\n');
}

/** Unified prompt builder — compresses context for cost targets (3–5K prompt tokens). */
export class PromptBuilder {
  buildConsultantPrompt(ctx: PromptBuilderContext, version = 'v1'): RenderedPrompt {
    return promptManager.render(
      'consultant.chat',
      {
        context: compactContext(ctx),
        question: ctx.question ?? 'What should we validate next?',
        locale: ctx.locale ?? 'ko',
      },
      version,
    );
  }

  buildResearchPrompt(ctx: PromptBuilderContext, version = 'v1'): RenderedPrompt {
    return promptManager.render(
      'research.agent',
      {
        context: compactContext(ctx),
        tasks: ctx.tasks ?? 'MARKET,COMPETITOR',
        locale: ctx.locale ?? 'ko',
      },
      version,
    );
  }

  buildMessages(ctx: PromptBuilderContext, kind: 'consultant' | 'research', version = 'v1'): ChatMessage[] {
    const rendered =
      kind === 'consultant'
        ? this.buildConsultantPrompt(ctx, version)
        : this.buildResearchPrompt(ctx, version);
    return rendered.messages;
  }
}

export const promptBuilder = new PromptBuilder();
