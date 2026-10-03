import type {AgentFactory} from "./types.ts";
import {localTools} from "../tools/index.ts";
import {LetterCountResultSchema} from "../schemas/schemas.ts";

/** Counting agent: understands the request, calls tools, returns a schema-validated result. */
export function createCountingAgent(AgentType: AgentFactory) {
  return new AgentType({
    tools: localTools,
    structuredOutputSchema: LetterCountResultSchema,
  })
}
