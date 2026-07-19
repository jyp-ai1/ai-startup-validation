import type { BrowserLaunchOptions } from '../types';
import { BrowserManager } from '../manager';

export type BrowserPoolOptions = {
  maxInstances?: number;
  idleTimeoutMs?: number;
  launchOptions?: BrowserLaunchOptions;
};

type PooledEntry = {
  manager: BrowserManager;
  lastUsed: number;
  inUse: boolean;
};

/** Pool of browser instances with reuse and idle timeout. */
export class BrowserPool {
  private readonly entries: PooledEntry[] = [];
  private readonly maxInstances: number;
  private readonly idleTimeoutMs: number;
  private readonly launchOptions: BrowserLaunchOptions;

  constructor(options: BrowserPoolOptions = {}) {
    this.maxInstances = options.maxInstances ?? 3;
    this.idleTimeoutMs = options.idleTimeoutMs ?? 60_000;
    this.launchOptions = options.launchOptions ?? { headless: true };
  }

  async acquire(): Promise<BrowserManager> {
    this.evictIdle();

    const available = this.entries.find((e) => !e.inUse && e.manager.isRunning());
    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available.manager;
    }

    if (this.entries.length >= this.maxInstances) {
      const oldest = this.entries
        .filter((e) => !e.inUse)
        .sort((a, b) => a.lastUsed - b.lastUsed)[0];
      if (oldest) {
        await oldest.manager.close();
        this.entries.splice(this.entries.indexOf(oldest), 1);
      }
    }

    const manager = new BrowserManager();
    await manager.launch(this.launchOptions);
    const entry: PooledEntry = { manager, lastUsed: Date.now(), inUse: true };
    this.entries.push(entry);
    return manager;
  }

  release(manager: BrowserManager): void {
    const entry = this.entries.find((e) => e.manager.id === manager.id);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = Date.now();
    }
  }

  async closeAll(): Promise<void> {
    for (const entry of this.entries) {
      await entry.manager.close();
    }
    this.entries.length = 0;
  }

  size(): number {
    return this.entries.length;
  }

  private evictIdle(): void {
    const now = Date.now();
    for (const entry of [...this.entries]) {
      if (!entry.inUse && now - entry.lastUsed > this.idleTimeoutMs) {
        void entry.manager.close();
        this.entries.splice(this.entries.indexOf(entry), 1);
      }
    }
  }
}

export const browserPool = new BrowserPool();
