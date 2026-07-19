import type { RegisteredTool, ToolMetadata } from '../types';
import { ToolNotFoundError } from '../errors';

/** Tool registry with metadata — search, categories, capabilities. */
export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  get(toolId: string): RegisteredTool {
    const tool = this.tools.get(toolId);
    if (!tool) throw new ToolNotFoundError(toolId);
    return tool;
  }

  tryGet(toolId: string): RegisteredTool | undefined {
    return this.tools.get(toolId);
  }

  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  list(): RegisteredTool[] {
    return [...this.tools.values()];
  }

  listMetadata(): ToolMetadata[] {
    return this.list().map(({ handler: _h, ...meta }) => meta);
  }

  listByCategory(category: string): RegisteredTool[] {
    return this.list().filter((t) => t.category === category);
  }

  listByTag(tag: string): RegisteredTool[] {
    return this.list().filter((t) => t.tags.includes(tag));
  }

  listByCapability(capability: string): RegisteredTool[] {
    return this.list().filter((t) => t.capabilities.includes(capability));
  }

  search(query: string): RegisteredTool[] {
    const q = query.toLowerCase();
    return this.list().filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q),
    );
  }

  getCategories(): string[] {
    return [...new Set(this.list().map((t) => t.category))];
  }

  /** Generate markdown documentation from tool metadata. */
  toMarkdown(): string {
    const lines: string[] = ['# MCP Tool Registry\n'];
    for (const cat of this.getCategories()) {
      lines.push(`## ${cat}\n`);
      for (const tool of this.listByCategory(cat)) {
        lines.push(`### ${tool.name} (\`${tool.id}\`)`);
        lines.push(`- Version: ${tool.version}`);
        lines.push(`- ${tool.description}`);
        lines.push(`- Permissions: ${tool.permissions.join(', ') || 'none'}`);
        lines.push(`- Tags: ${tool.tags.join(', ')}`);
        lines.push(`- Capabilities: ${tool.capabilities.join(', ')}`);
        lines.push('');
      }
    }
    return lines.join('\n');
  }
}

export const toolRegistry = new ToolRegistry();
