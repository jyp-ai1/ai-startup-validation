import { describe, it, expect } from 'vitest';

import { PromptManager, extractVariables } from './manager';

describe('PromptManager', () => {
  it('extracts variables from templates', () => {
    const vars = extractVariables('Hello {{name}}, welcome to {{product}}');
    expect(vars).toEqual(['name', 'product']);
  });

  it('registers and renders prompt templates', () => {
    const manager = new PromptManager();
    manager.register({
      id: 'greeting',
      name: 'Greeting',
      system: 'You are a helpful assistant for {{product}}.',
      user: 'Hello, my name is {{name}}.',
    });

    const rendered = manager.render('greeting', { product: 'Acme', name: 'Alice' });
    expect(rendered.messages).toHaveLength(2);
    expect(rendered.messages[0]?.content).toContain('Acme');
    expect(rendered.messages[1]?.content).toContain('Alice');
  });

  it('supports template versioning', () => {
    const manager = new PromptManager();
    manager.register({ id: 'test', name: 'Test', user: 'v1', version: '1.0.0' });
    manager.register({ id: 'test', name: 'Test', user: 'v2', version: '2.0.0' });

    expect(manager.get('test').user).toBe('v2');
    expect(manager.get('test', '1.0.0').user).toBe('v1');
  });
});
