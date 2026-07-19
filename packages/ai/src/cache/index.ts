import type { ChatResponse } from '../types';

export type CacheKey = string;

export type CacheEntry<T> = {
  key: CacheKey;
  value: T;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
};

/** Response cache port — implementation can be in-memory, Redis, etc. */
export interface ResponseCachePort<T = ChatResponse> {
  get(key: CacheKey): Promise<T | undefined>;
  set(key: CacheKey, value: T, ttlMs?: number): Promise<void>;
  delete(key: CacheKey): Promise<boolean>;
  clear(): Promise<void>;
  has(key: CacheKey): Promise<boolean>;
}

/** In-memory response cache for development. */
export class InMemoryResponseCache<T = ChatResponse> implements ResponseCachePort<T> {
  private readonly store = new Map<CacheKey, CacheEntry<T>>();

  async get(key: CacheKey): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: CacheKey, value: T, ttlMs?: number): Promise<void> {
    const now = new Date();
    this.store.set(key, {
      key,
      value,
      createdAt: now.toISOString(),
      expiresAt: ttlMs ? new Date(now.getTime() + ttlMs).toISOString() : undefined,
    });
  }

  async delete(key: CacheKey): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async has(key: CacheKey): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }
}

export function createCacheKey(parts: Record<string, string | number | boolean>): string {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
}

export const responseCache = new InMemoryResponseCache();
