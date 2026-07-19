import { logger as appLogger } from '@repo/core/logger';
import type { Logger } from '@repo/core/logger';

import type { BrowserEvent } from '../types';

export class BrowserLogger {
  constructor(private readonly logger: Logger = appLogger.child('browser')) {}

  info(event: string, data?: Record<string, unknown>): void {
    this.logger.info(event, data);
  }

  error(event: string, data?: Record<string, unknown>): void {
    this.logger.error(event, data);
  }

  debug(event: string, data?: Record<string, unknown>): void {
    this.logger.debug(event, data);
  }
}

export type BrowserEventHandler = (event: BrowserEvent) => void;

export class BrowserEventEmitter {
  private readonly handlers: BrowserEventHandler[] = [];

  on(handler: BrowserEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  emit(event: BrowserEvent): void {
    for (const h of this.handlers) h(event);
  }
}

export const browserLogger = new BrowserLogger();
export const browserEvents = new BrowserEventEmitter();
