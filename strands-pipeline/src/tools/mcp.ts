import {McpClient} from "@strands-agents/sdk";
import {fileURLToPath} from "node:url";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";

/** Spawns the local MCP server as a child process and talks to it over stdio. */
export function createLetterToolsClient() {
  return new McpClient({
    transport: new StdioClientTransport({
      command: 'bun',
      args: [fileURLToPath(new URL('../mcp-server/server.ts', import.meta.url))],
    }),
  })
}