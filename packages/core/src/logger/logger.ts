type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

type LoggerOptions = {
  namespace?: string;
  minLevel?: LogLevel;
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatMessage(
  level: LogLevel,
  namespace: string | undefined,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const prefix = namespace ? `[${namespace}]` : '';
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}${contextStr}`.trim();
}

export class Logger {
  private readonly namespace?: string;
  private readonly minLevel: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.namespace = options.namespace;
    this.minLevel =
      options.minLevel ??
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  }

  child(namespace: string): Logger {
    const childNamespace = this.namespace
      ? `${this.namespace}:${namespace}`
      : namespace;
    return new Logger({ namespace: childNamespace, minLevel: this.minLevel });
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level, this.minLevel)) return;

    const formatted = formatMessage(level, this.namespace, message, context);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }
}

/** Default application logger. */
export const logger = new Logger({ namespace: 'app' });

export type { LogLevel, LogContext, LoggerOptions };
