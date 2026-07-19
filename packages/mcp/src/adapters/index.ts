import { z } from 'zod';

import type { AdapterKind, ToolAdapterPort, ToolMetadata } from '../types';

/** Base adapter port — implementations deferred to Sprint 7+. */
export abstract class BaseToolAdapter implements ToolAdapterPort {
  abstract readonly kind: AdapterKind;

  abstract getToolDefinitions(): ToolMetadata[];

  createHandlers(): Map<string, import('../types').ToolHandler> {
    const handlers = new Map<string, import('../types').ToolHandler>();
    for (const tool of this.getToolDefinitions()) {
      handlers.set(tool.id, async (input) => {
        return { stub: true, adapter: this.kind, toolId: tool.id, input };
      });
    }
    return handlers;
  }
}

/** Stub metadata factory for adapter tools. */
export function createAdapterToolMeta(
  kind: AdapterKind,
  name: string,
  description: string,
  permissions: string[] = [],
): ToolMetadata {
  return {
    id: `${kind}.${name}`,
    name,
    version: '0.1.0',
    category: kind,
    description,
    permissions,
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ stub: z.boolean(), adapter: z.string(), toolId: z.string() }),
    timeout: 30_000,
    retryable: true,
    cacheable: false,
    tags: [kind, 'adapter', 'stub'],
    capabilities: [kind],
  };
}

// Adapter stubs — interface only, no real implementations
export class FilesystemAdapter extends BaseToolAdapter {
  readonly kind = 'filesystem' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta('filesystem', 'read_file', 'Read file contents', ['fs.read']),
      createAdapterToolMeta('filesystem', 'write_file', 'Write file contents', ['fs.write']),
      createAdapterToolMeta('filesystem', 'list_directory', 'List directory', ['fs.read']),
    ];
  }
}

export class PlaywrightAdapter extends BaseToolAdapter {
  readonly kind = 'playwright' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta('playwright', 'navigate', 'Navigate to URL', ['browser.navigate']),
      createAdapterToolMeta('playwright', 'click', 'Click element', ['browser.interact']),
      createAdapterToolMeta('playwright', 'screenshot', 'Take screenshot', ['browser.capture']),
    ];
  }
}

export class GitHubAdapter extends BaseToolAdapter {
  readonly kind = 'github' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta('github', 'create_issue', 'Create GitHub issue', ['github.write']),
      createAdapterToolMeta('github', 'list_prs', 'List pull requests', ['github.read']),
    ];
  }
}

export class SlackAdapter extends BaseToolAdapter {
  readonly kind = 'slack' as const;
  getToolDefinitions() {
    return [createAdapterToolMeta('slack', 'send_message', 'Send Slack message', ['slack.write'])];
  }
}

export class DiscordAdapter extends BaseToolAdapter {
  readonly kind = 'discord' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta('discord', 'send_message', 'Send Discord message', ['discord.write']),
    ];
  }
}

export class GoogleDriveAdapter extends BaseToolAdapter {
  readonly kind = 'google-drive' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta('google-drive', 'upload_file', 'Upload to Drive', ['drive.write']),
      createAdapterToolMeta('google-drive', 'list_files', 'List Drive files', ['drive.read']),
    ];
  }
}

export class NotionAdapter extends BaseToolAdapter {
  readonly kind = 'notion' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta('notion', 'create_page', 'Create Notion page', ['notion.write']),
      createAdapterToolMeta('notion', 'query_database', 'Query Notion database', ['notion.read']),
    ];
  }
}

export class SequentialThinkingAdapter extends BaseToolAdapter {
  readonly kind = 'sequential-thinking' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta(
        'sequential-thinking',
        'think',
        'Sequential reasoning step',
        ['thinking.use'],
      ),
    ];
  }
}

export class BrowserAdapter extends BaseToolAdapter {
  readonly kind = 'browser' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta('browser', 'open_url', 'Open URL in browser', ['browser.navigate']),
    ];
  }
}

export class ShellAdapter extends BaseToolAdapter {
  readonly kind = 'shell' as const;
  getToolDefinitions() {
    return [
      createAdapterToolMeta('shell', 'execute', 'Execute shell command', ['shell.execute']),
    ];
  }
}

export const ADAPTER_REGISTRY: Record<AdapterKind, () => BaseToolAdapter> = {
  filesystem: () => new FilesystemAdapter(),
  playwright: () => new PlaywrightAdapter(),
  github: () => new GitHubAdapter(),
  slack: () => new SlackAdapter(),
  discord: () => new DiscordAdapter(),
  'google-drive': () => new GoogleDriveAdapter(),
  notion: () => new NotionAdapter(),
  'sequential-thinking': () => new SequentialThinkingAdapter(),
  browser: () => new BrowserAdapter(),
  shell: () => new ShellAdapter(),
};
