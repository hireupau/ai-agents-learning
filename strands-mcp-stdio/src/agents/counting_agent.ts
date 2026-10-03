import type {McpClient} from "@strands-agents/sdk";
import type {AgentFactory} from "./types.ts";
import {LetterCountResultSchema} from "../schemas/schemas.ts";

/** Counting agent: understands the request, calls MCP tools, returns a schema-validated result. */
export function createCountingAgent(AgentType: AgentFactory, mcpClients: McpClient[]) {
  return new AgentType({
    tools: mcpClients,
    structuredOutputSchema: LetterCountResultSchema,
  })
}
