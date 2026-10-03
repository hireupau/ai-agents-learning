import type {McpClient} from "@strands-agents/sdk";
import type {AgentFactory} from "./types.ts";
import {CountingOutputSchema} from "../schemas/schemas.ts";

/** Counting agent: understands the request, calls MCP tools, returns a schema-validated result or a refusal. */
export function createCountingAgent(AgentType: AgentFactory, mcpClients: McpClient[]) {
  return new AgentType({
    name: 'counting-agent',
    systemPrompt:
      'You count letters in words. Use the letter_counter tool for every count; never count yourself. ' +
      'Return the letter, the word and the count the tool reported in `result`. ' +
      'If the request is not about counting a letter in a word, do not answer it: set `refusal` to a short reason instead.',
    tools: mcpClients,
    structuredOutputSchema: CountingOutputSchema,
    printer: false, // intermediate stage: only the presenting agent's output is shown to the user
  })
}
