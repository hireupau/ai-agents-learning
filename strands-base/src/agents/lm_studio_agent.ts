import {Agent} from "@strands-agents/sdk";
import type {AgentOptions} from "./types.ts";
import {OpenAIModel} from "@strands-agents/sdk/models/openai";
import {config} from "../config.ts";

export class LMStudioAgent extends Agent {
  constructor(cfg: AgentOptions = {}) {
    super({
      ...cfg,
      model: new OpenAIModel({
        api: 'chat',
        apiKey: 'lm-studio',
        modelId: config.lmstudio.modelId,
        clientConfig: { baseURL: config.lmstudio.baseUrl },
      }),
    })
  }
}
