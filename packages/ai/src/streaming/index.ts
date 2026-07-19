import type { StreamChunk } from '../types';

/** Unified streaming collector — no provider-specific stream APIs leak. */
export async function collectStream(
  stream: AsyncIterable<StreamChunk>,
): Promise<{ content: string; usage?: StreamChunk['usage']; finishReason?: StreamChunk['finishReason'] }> {
  let content = '';
  let usage: StreamChunk['usage'];
  let finishReason: StreamChunk['finishReason'];

  for await (const chunk of stream) {
    content += chunk.delta;
    if (chunk.usage) usage = chunk.usage;
    if (chunk.finishReason) finishReason = chunk.finishReason;
  }

  return { content, usage, finishReason };
}

export type StreamHandler = {
  onChunk: (chunk: StreamChunk) => void;
  onDone?: (result: { content: string; usage?: StreamChunk['usage'] }) => void;
  onError?: (error: unknown) => void;
};

/** Process stream with callbacks — provider-agnostic. */
export async function processStream(
  stream: AsyncIterable<StreamChunk>,
  handler: StreamHandler,
): Promise<string> {
  let content = '';
  try {
    for await (const chunk of stream) {
      handler.onChunk(chunk);
      content += chunk.delta;
    }
    handler.onDone?.({ content, usage: undefined });
    return content;
  } catch (error) {
    handler.onError?.(error);
    throw error;
  }
}

export { collectStream as streamToText };
