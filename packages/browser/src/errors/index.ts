import { BaseError } from '@repo/core/errors';

export class BrowserLaunchError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details);
  }
}

export class BrowserNotRunningError extends BaseError {
  constructor() {
    super('Browser is not running', 'INTERNAL_SERVER_ERROR', 503);
  }
}

export class NavigationError extends BaseError {
  readonly url: string;
  constructor(url: string, message: string, details?: unknown) {
    super(message, 'INTERNAL_SERVER_ERROR', 502, details);
    this.url = url;
  }
}

export class SelectorNotFoundError extends BaseError {
  readonly selector: string;
  constructor(selector: string) {
    super(`Selector not found: ${selector}`, 'NOT_FOUND', 404);
    this.selector = selector;
  }
}

export class DownloadError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details);
  }
}

export { isBaseError } from '@repo/core/errors';
