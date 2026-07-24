import { generateConsultantAnswer } from '@/features/ai-consultant/services/consultant-llm-service';
import { createSuccessResponse, handleUnknownError } from '@repo/core/response';
import { isRealAIEnabled, resolveDefaultModel, promptBuilder, getAIPlatform } from '@repo/ai';

type ChatBody = {
  question: string;
  projectTitle: string;
  memory?: string[];
  locale?: string;
  promptVersion?: 'v1' | 'v2' | 'v3';
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
};

function parseBody(raw: unknown): ChatBody {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid request body');
  }

  const body = raw as Record<string, unknown>;
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const projectTitle = typeof body.projectTitle === 'string' ? body.projectTitle.trim() : '';

  if (!question || question.length > 2000) {
    throw new Error('Question is required (max 2000 chars)');
  }
  if (!projectTitle || projectTitle.length > 200) {
    throw new Error('Project title is required');
  }

  const promptVersion =
    body.promptVersion === 'v1' || body.promptVersion === 'v2' || body.promptVersion === 'v3'
      ? body.promptVersion
      : 'v1';

  return {
    question,
    projectTitle,
    memory: Array.isArray(body.memory)
      ? body.memory.filter((item): item is string => typeof item === 'string')
      : undefined,
    locale: typeof body.locale === 'string' ? body.locale : undefined,
    promptVersion,
    stream: body.stream === true,
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
    maxTokens: typeof body.maxTokens === 'number' ? body.maxTokens : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const body = parseBody(await request.json());

    if (!isRealAIEnabled()) {
      return Response.json(
        createSuccessResponse({
          mode: 'mock',
          answer:
            'OpenRouter is not configured. Set OPENROUTER_API_KEY to enable Gemini Flash responses.',
        }),
      );
    }

    if (body.stream) {
      const messages = promptBuilder.buildMessages(
        {
          projectTitle: body.projectTitle,
          question: body.question,
          memory: body.memory?.join(', '),
          locale: body.locale ?? 'ko',
        },
        'consultant',
        body.promptVersion ?? 'v1',
      );

      const encoder = new TextEncoder();
      const model = resolveDefaultModel('openrouter');

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of getAIPlatform().chat.stream({
              model,
              messages,
              maxTokens: body.maxTokens ?? 512,
              temperature: body.temperature ?? 0.5,
            })) {
              if (chunk.delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`),
                );
              }
              if (chunk.done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              }
            }
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Stream failed' })}\n\n`,
              ),
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const result = await generateConsultantAnswer({
      question: body.question,
      projectTitle: body.projectTitle,
      memory: body.memory,
      locale: body.locale,
      promptVersion: body.promptVersion,
    });

    return Response.json(createSuccessResponse({ mode: 'live', ...result }));
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 400 });
  }
}
