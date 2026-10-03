import {McpClient} from "@strands-agents/sdk";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";

/** Spawns the local MCP server as a child process and talks to it over stdio. */
export function createLetterToolsClient() {
  return new McpClient({
    transport: new StdioClientTransport({
      command: 'bun',
      args: ['src/mcp-server/server.ts'],
    }),
  })
}