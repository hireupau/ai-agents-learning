import {Agent} from "@strands-agents/sdk";
import type {AgentOptions} from "./types.ts";
import {BedrockModel} from "@strands-agents/sdk/models/bedrock";
import {config} from "../config.ts";

export class BedrockAgent extends Agent {
  constructor(cfg: AgentOptions = {}) {
    super({
      ...cfg,
      model: new BedrockModel({
        modelId: config.bedrock.modelId,
        region: config.bedrock.region,
      }),
    })
  }
}
