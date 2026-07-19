import type {
  ChatRequest,
  ChatResponse,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
} from '@repo/ai';

import { ai } from './platform';

/** Unified chat — delegates to AI platform, never to provider SDK. */
export function chat(request: ChatRequest): Promise<ChatResponse> {
  return ai.chat.chat(request);
}

export function stream(request: ChatRequest): AsyncIterable<StreamChunk> {
  return ai.chat.stream(request);
}

export function complete(request: CompletionRequest): Promise<CompletionResponse> {
  return ai.chat.complete(request);
}
