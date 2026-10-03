# strands-mcp-stdio

Step 2: the same letter-count agent as `strands-base`, but the tool is served by an MCP server over stdio instead of running in-process.

- `src/mcp-server/server.ts` — MCP server exposing `letter_counter` (stdout is the protocol; log to stderr only)
- `src/tools/mcp.ts` — `McpClient` that spawns the server as a child process
- `src/pipeline.ts` — owns the client lifecycle (`close()` disconnects it)

```bash
bun install
cp .env.example .env   # fill in a provider
bun run dev            # the agent spawns the MCP server itself
```
