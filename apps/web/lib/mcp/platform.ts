/**
 * MCP platform entry for apps/web.
 * Applications communicate only with MCPGateway — never directly with MCP servers.
 */
import { getMCPPlatform } from '@repo/mcp';

export const mcp = getMCPPlatform();

export { getMCPPlatform };
