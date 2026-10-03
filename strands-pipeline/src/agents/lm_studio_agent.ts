import {Agent} from "@strands-agents/sdk";
import type {AgentOptions} from "./types.ts";
import {OpenAIModel} from "@strands-agents/sdk/models/openai";
import {config} from "../config.ts";

/**
 * Strands forces structured output by sending `tool_choice: {type: 'function', ...}`, but LM Studio only
 * accepts 'none' | 'auto' | 'required'. Downgrade the object form to 'required' so the request is valid.
 */
const lmStudioFetch = async (input: string | URL | Request, init?: RequestInit) => {
  if (typeof init?.body === 'string') {
    const body = JSON.parse(init.body)
    if (typeof body.tool_choice === 'object' && body.tool_choice !== null) {
      body.tool_choice = 'required'
      init = { ...init, body: JSON.stringify(body) }
    }
  }
  return fetch(input, init)
}

export class LMStudioAgent extends Agent {
  constructor(cfg: AgentOptions = {}) {
    super({
      ...cfg,
      model: new OpenAIModel({
        api: 'chat',
        apiKey: 'lm-studio',
        modelId: config.lmstudio.modelId,
        clientConfig: { baseURL: config.lmstudio.baseUrl, fetch: lmStudioFetch },
      }),
    })
  }
}
