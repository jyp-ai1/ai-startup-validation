import type { PolicyRule } from '../types';
import { PermissionDeniedError } from '../errors';

export type ToolPermission = {
  toolId: string;
  requiredPermissions: string[];
};

/** Resolve tool permissions against execution context and policies. */
export class PermissionResolver {
  private readonly policies: PolicyRule[] = [];

  addPolicy(policy: PolicyRule): void {
    const idx = this.policies.findIndex((p) => p.id === policy.id);
    if (idx >= 0) this.policies[idx] = policy;
    else this.policies.push(policy);
  }

  removePolicy(policyId: string): boolean {
    const idx = this.policies.findIndex((p) => p.id === policyId);
    if (idx >= 0) {
      this.policies.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Check if context has all required permissions for a tool. */
  canExecute(
    contextPermissions: string[],
    toolPermissions: string[],
    toolId?: string,
    category?: string,
  ): boolean {
    // Explicit deny policies first
    for (const policy of this.policies) {
      if (policy.effect !== 'deny') continue;
      if (policy.toolIds?.includes(toolId ?? '')) return false;
      if (category && policy.categories?.includes(category)) return false;
      if (policy.permissions.some((p) => contextPermissions.includes(p))) return false;
    }

    // Explicit allow policies
    const allowPolicies = this.policies.filter((p) => p.effect === 'allow');
    if (allowPolicies.length > 0) {
      const allowed = allowPolicies.some(
        (p) =>
          (!p.toolIds || (toolId && p.toolIds.includes(toolId))) &&
          (!p.categories || (category && p.categories.includes(category))) &&
          p.permissions.some((perm) => contextPermissions.includes(perm)),
      );
      if (!allowed) return false;
    }

    // Tool-level permission check
    return toolPermissions.every((p) => contextPermissions.includes(p));
  }

  requireExecute(
    contextPermissions: string[],
    toolPermissions: string[],
    toolId?: string,
    category?: string,
  ): void {
    if (!this.canExecute(contextPermissions, toolPermissions, toolId, category)) {
      const missing = toolPermissions.find((p) => !contextPermissions.includes(p));
      throw new PermissionDeniedError(missing ?? 'unknown', toolId);
    }
  }
}

export const permissionResolver = new PermissionResolver();

export type { PolicyRule, PolicyEffect } from '../types';
