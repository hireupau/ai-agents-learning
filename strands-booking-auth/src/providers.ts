import minimist from 'minimist'
import type {AgentFactory} from "./agents/types.ts";
import {LMStudioAgent} from "./agents/lm_studio_agent.ts";
import {BedrockAgent} from "./agents/bedrock_agent.ts";

// Adding a provider = one file in agents/ plus one line here.
const PROVIDERS = {
  lmstudio: LMStudioAgent,
  bedrock: BedrockAgent,
} satisfies Record<string, AgentFactory>;
export type Provider = keyof typeof PROVIDERS;

export function resolveAgentType(argv: string[]): AgentFactory {
  const args = minimist(argv, { string: ['provider'], default: { provider: 'lmstudio' } })
  const provider = args.provider as Provider

  if (!(provider in PROVIDERS)) {
    throw new Error(`Unknown provider '${provider}'. Valid options: ${Object.keys(PROVIDERS).join(', ')}`)
  }

  return PROVIDERS[provider]
}
