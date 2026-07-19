import type { Logger } from '../logger/logger';

/**
 * Base service — application logic layer.
 *
 * Services orchestrate repositories and enforce business rules.
 * They never import database SDKs directly.
 */
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /** Log a service-level info message. */
  protected logInfo(message: string, context?: Record<string, unknown>): void {
    this.logger.info(message, context);
  }

  /** Log a service-level error. */
  protected logError(message: string, context?: Record<string, unknown>): void {
    this.logger.error(message, context);
  }
}
