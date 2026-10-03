import type {Agent, AgentConfig} from "@strands-agents/sdk";

/** Config every provider agent accepts: the caller supplies everything except the model. */
export type AgentOptions = Omit<AgentConfig, 'model'>

/** A provider-bound Agent class. Every file in agents/ that wraps a model provider satisfies this. */
export type AgentFactory = new (cfg?: AgentOptions) => Agent
