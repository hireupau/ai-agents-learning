export const config = {
  lmstudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234/v1',
    modelId: process.env.LM_STUDIO_MODEL_ID ?? 'google/gemma-4-31b',
  },
  bedrock: {
    region: process.env.AWS_REGION ?? 'ap-southeast-2',
    modelId: process.env.BEDROCK_MODEL_ID ?? 'au.anthropic.claude-haiku-4-5-20251001-v1:0',
  },
}
