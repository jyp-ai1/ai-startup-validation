import type { ExecutionContext } from '../types';

export function createExecutionContext(
  partial: Partial<ExecutionContext> & Pick<ExecutionContext, 'traceId' | 'requestId'>,
): ExecutionContext {
  return {
    userId: partial.userId ?? null,
    sessionId: partial.sessionId ?? null,
    workspaceId: partial.workspaceId ?? null,
    organizationId: partial.organizationId ?? null,
    traceId: partial.traceId,
    requestId: partial.requestId,
    environment: partial.environment ?? 'development',
    permissions: partial.permissions ?? [],
    metadata: partial.metadata,
  };
}

export function forkContext(
  parent: ExecutionContext,
  overrides: Partial<ExecutionContext> = {},
): ExecutionContext {
  return {
    ...parent,
    ...overrides,
    requestId: overrides.requestId ?? crypto.randomUUID(),
    metadata: { ...parent.metadata, ...overrides.metadata },
  };
}

export type { ExecutionContext } from '../types';
