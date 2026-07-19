import type { ChatMessage } from '../types';

/** Conversation memory port — store and retrieve message history. */
export interface ConversationMemoryPort {
  getMessages(sessionId: string): Promise<ChatMessage[]>;
  addMessage(sessionId: string, message: ChatMessage): Promise<void>;
  clear(sessionId: string): Promise<void>;
}

/** Session-scoped memory with metadata. */
export interface SessionMemoryPort {
  get<T = unknown>(sessionId: string, key: string): Promise<T | undefined>;
  set(sessionId: string, key: string, value: unknown): Promise<void>;
  delete(sessionId: string, key: string): Promise<void>;
  clear(sessionId: string): Promise<void>;
}

/** Summarization memory — compress long conversations. */
export interface SummarizationMemoryPort {
  summarize(sessionId: string, messages: ChatMessage[]): Promise<string>;
  getSummary(sessionId: string): Promise<string | undefined>;
  setSummary(sessionId: string, summary: string): Promise<void>;
}

export type MemoryPort = ConversationMemoryPort & SessionMemoryPort;
