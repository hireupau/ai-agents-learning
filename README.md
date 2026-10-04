# AI-Agents-Learning

Practice project for learning the Strands Agents SDK (TypeScript).
Reference: https://github.com/hireupau/architecture-examples

## Setup

```bash
cd strands-demo
bun install
cp .env.example .env   # fill in a provider
bun run dev
```

## Learning path

Tick off as you go; keep notes per step in `notes/`.

- [x] 1. Single agent + local tool (`strands-base`)
- [x] 2. MCP tool over stdio (`strands-mcp-stdio`)
- [x] 3. Structured output + two-agent pipeline
- [x] 4. Observability (`strands-langfuse-demo`)
- [x] 5. JWT-as-tool-argument auth (`strands-booking-auth`)
- [ ] 6. Sessions + credential injection (`strands-helpdesk-memory`)
- [ ] 7. OAuth token lifecycle (`strands-oauth-lifecycle`)
