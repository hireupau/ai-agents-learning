import type {AgentFactory} from "./agents/types.ts";
import {createCountingAgent} from "./agents/counting_agent.ts";
import {
  CountingOutputSchema,
  type StructuredOutput,
  StructuredOutputSchema
} from "./schemas/schemas.ts";
import {createLetterToolsClient} from "./tools/mcp.ts";
import {err, ok, type Result} from "./util/result.ts";
import {createStructuredOutputAgent} from "./agents/output_agent.ts";

/**
 * The agent pipeline, independent of any UI. Counting agent -> presenting agent.
 */
export function createPipeline(AgentType: AgentFactory) {
  // The MCP client connects lazily on first use and owns a child process, so close() must disconnect it.
  const letterTools = createLetterToolsClient()

  return {
    async run(input: string): Promise<Result<StructuredOutput>> {
      // Fresh agents per request: each turn is independent, so earlier turns must not leak into the context.
      const countingAgent = createCountingAgent(AgentType, [letterTools])
      const structuredOutputAgent = createStructuredOutputAgent(AgentType)
      const countingAgentResult = await countingAgent.invoke(input)
      
      const parsed = CountingOutputSchema.safeParse(countingAgentResult.structuredOutput)
      if (!parsed.success) {
        return err(`Counting agent did not return a valid result: ${parsed.error.message}`)
      }
      if (parsed.data.refusal) return err(parsed.data.refusal)
      if (!parsed.data.result) return err('Counting agent returned neither a result nor a refusal.')
      const structuredOutputAgentResult = await structuredOutputAgent.invoke(JSON.stringify(parsed.data.result))
      const outputParsed = StructuredOutputSchema.safeParse(structuredOutputAgentResult.structuredOutput)
      return outputParsed.success ? ok(outputParsed.data) : err(`Presenting agent did not return a valid result: ${outputParsed.error.message}`)
    },
    /** Release resources (e.g. MCP connections) when the session ends. */
    async close(): Promise<void> {
      await letterTools.disconnect()
    },
  }
}
