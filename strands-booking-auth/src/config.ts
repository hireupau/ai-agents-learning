export const config = {
  lmstudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234/v1',
    modelId: process.env.LM_STUDIO_MODEL_ID ?? 'google/gemma-4-31b',
  },
  bedrock: {
    region: process.env.AWS_REGION ?? 'ap-southeast-2',
    modelId: process.env.BEDROCK_MODEL_ID ?? 'au.anthropic.claude-haiku-4-5-20251001-v1:0',
  },
  jwtSecret: (() => {
    const raw = process.env.JWT_SECRET;
    if (!raw) {
      throw new Error('JWT_SECRET is required. Generate with: openssl rand -base64 32');
    }
    // Stored as base64 (local .env) or fetched from Secrets Manager (ECS).
    // Buffer is a Uint8Array subtype, directly accepted by Jose's SignJWT/jwtVerify.
    return Buffer.from(raw, 'base64');
  })(),
  jwtExpirySeconds: 15 * 60,
  dbProvider: (process.env.DB_PROVIDER ?? 'sqlite') as 'sqlite' | 'dynamodb',
  sqliteFile: process.env.SQLITE_FILE ?? 'bookings.db',
  demoMode: process.env.DEMO_MODE === 'true',
  mcpServerUrl: process.env.MCP_SERVER_URL,
  transport: (process.env.TRANSPORT ?? 'stdio') as 'stdio' | 'http',
  port: parseInt(process.env.PORT ?? '3000', 10),
}
