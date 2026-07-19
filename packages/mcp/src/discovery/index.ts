import type { ServerInfo, ToolMetadata } from '../types';
import type { ToolRegistry } from '../registry';

/** Discover MCP servers on the network or from configuration. */
export class ServerDiscovery {
  private readonly servers = new Map<string, ServerInfo>();

  register(server: ServerInfo): void {
    this.servers.set(server.id, server);
  }

  unregister(serverId: string): boolean {
    return this.servers.delete(serverId);
  }

  get(serverId: string): ServerInfo | undefined {
    return this.servers.get(serverId);
  }

  list(): ServerInfo[] {
    return [...this.servers.values()];
  }

  listByTransport(transport: ServerInfo['transport']): ServerInfo[] {
    return this.list().filter((s) => s.transport === transport);
  }

  discover(_options?: { timeout?: number }): Promise<ServerInfo[]> {
    // Future: mDNS, config scan, remote registry
    return Promise.resolve(this.list());
  }
}

/** Discover tools from registry and remote servers. */
export class ToolDiscovery {
  constructor(private readonly registry: ToolRegistry) {}

  listLocal(): ToolMetadata[] {
    return this.registry.listMetadata();
  }

  search(query: string): ToolMetadata[] {
    return this.registry.search(query).map(({ handler: _h, ...meta }) => meta);
  }

  listByCapability(capability: string): ToolMetadata[] {
    return this.registry.listByCapability(capability).map(({ handler: _h, ...meta }) => meta);
  }

  /** Recommend tools for AI agent based on query and capabilities. */
  recommend(query: string, limit = 5): ToolMetadata[] {
    return this.search(query).slice(0, limit);
  }
}

/** Discover server and tool capabilities. */
export class CapabilityDiscovery {
  constructor(
    private readonly serverDiscovery: ServerDiscovery,
    private readonly toolDiscovery: ToolDiscovery,
  ) {}

  listServerCapabilities(): string[] {
    const caps = new Set<string>();
    for (const server of this.serverDiscovery.list()) {
      for (const c of server.capabilities) caps.add(c);
    }
    return [...caps];
  }

  listToolCapabilities(): string[] {
    const caps = new Set<string>();
    for (const tool of this.toolDiscovery.listLocal()) {
      for (const c of tool.capabilities) caps.add(c);
    }
    return [...caps];
  }

  listAll(): string[] {
    return [...new Set([...this.listServerCapabilities(), ...this.listToolCapabilities()])];
  }
}

export const serverDiscovery = new ServerDiscovery();
