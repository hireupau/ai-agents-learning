import type {AgentFactory} from "./types.ts";
import {StructuredOutputSchema} from "../schemas/schemas.ts";

/** Presenting agent: turns a validated letter-count result (JSON) into one friendly sentence. No tools. */
export function createStructuredOutputAgent(AgentType: AgentFactory) {
  return new AgentType({
    name: 'structured-output-agent',
    systemPrompt:
      'You receive a JSON letter-count result with letter, word and count. ' +
      'Reply with a quirky tone stating it. Use only the values given; do not recount or add facts.',
    structuredOutputSchema: StructuredOutputSchema,
  })
}