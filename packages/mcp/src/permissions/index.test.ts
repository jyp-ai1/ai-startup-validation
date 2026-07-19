import { describe, it, expect } from 'vitest';

import { PermissionResolver } from './index';

describe('PermissionResolver', () => {
  it('allows when context has required permissions', () => {
    const resolver = new PermissionResolver();
    expect(resolver.canExecute(['fs.read', 'fs.write'], ['fs.read'], 'fs.read_file', 'filesystem')).toBe(true);
  });

  it('denies when permissions missing', () => {
    const resolver = new PermissionResolver();
    expect(resolver.canExecute(['fs.read'], ['fs.write'], 'fs.write_file')).toBe(false);
  });

  it('applies deny policy', () => {
    const resolver = new PermissionResolver();
    resolver.addPolicy({
      id: 'deny-shell',
      effect: 'deny',
      permissions: ['shell.execute'],
      categories: ['shell'],
    });
    expect(
      resolver.canExecute(['shell.execute'], ['shell.execute'], 'shell.execute', 'shell'),
    ).toBe(false);
  });

  it('throws PermissionDeniedError on require', () => {
    const resolver = new PermissionResolver();
    expect(() => resolver.requireExecute([], ['admin'], 'admin.tool')).toThrow();
  });
});
