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
  researchTotal?: string;
  evidenceTotal?: string;
  evidenceHigh?: string;
  vocTotal?: string;
  competitorTotal?: string;
  validationScore?: string;
  mockVerdict?: string;
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

  buildResearchPrompt(ctx: PromptBuilderContext, version = 'v2'): RenderedPrompt {
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

  buildDecisionPrompt(ctx: PromptBuilderContext, version = 'v1'): RenderedPrompt {
    return promptManager.render(
      'decision.agent',
      {
        context: compactContext(ctx),
        locale: ctx.locale ?? 'ko',
        researchTotal: ctx.researchTotal ?? '0',
        evidenceTotal: ctx.evidenceTotal ?? '0',
        evidenceHigh: ctx.evidenceHigh ?? '0',
        vocTotal: ctx.vocTotal ?? '0',
        competitorTotal: ctx.competitorTotal ?? '0',
        validationScore: ctx.validationScore ?? 'n/a',
        mockVerdict: ctx.mockVerdict ?? 'HOLD',
      },
      version,
    );
  }

  buildMessages(
    ctx: PromptBuilderContext,
    kind: 'consultant' | 'research' | 'decision',
    version = 'v1',
  ): ChatMessage[] {
    const rendered =
      kind === 'consultant'
        ? this.buildConsultantPrompt(ctx, version)
        : kind === 'research'
          ? this.buildResearchPrompt(ctx, version)
          : this.buildDecisionPrompt(ctx, version);
    return rendered.messages;
  }
}

export const promptBuilder = new PromptBuilder();
