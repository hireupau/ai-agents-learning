import type {AgentFactory} from "./agents/types.ts";
import {createCountingAgent} from "./agents/counting_agent.ts";
import {LetterCountResultSchema, type LetterCountResult} from "./schemas/schemas.ts";
import {err, ok, type Result} from "./util/result.ts";

/**
 * The agent pipeline, independent of any UI. Later stages (presenting agent, MCP tools,
 * tracing, auth) are added here and in agents/, not in the REPL wiring.
 */
export function createPipeline(AgentType: AgentFactory) {
  const countingAgent = createCountingAgent(AgentType)

  return {
    async run(input: string): Promise<Result<LetterCountResult>> {
      const result = await countingAgent.invoke(input)
      // Only validated, typed fields cross the boundary between stages.
      const parsed = LetterCountResultSchema.safeParse(result.structuredOutput)
      return parsed.success ? ok(parsed.data) : err(`Agent did not return a valid result: ${parsed.error.message}`)
    },
    /** Release resources (e.g. MCP connections) when the session ends. */
    async close(): Promise<void> {},
  }
}
