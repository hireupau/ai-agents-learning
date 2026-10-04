/**
 * OpenTelemetry bootstrap. Must be the FIRST import of the entry point so the global tracer provider exists
 * before any Strands agent is created (agents pick it up when constructed).
 *
 * Bun supports AsyncLocalStorage but the OTel SDK doesn't auto-detect it outside Node, so without
 * ensureContextManager() context.with() is a no-op and parent/child span links silently break.
 *
 * Credentials come from LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_BASE_URL (Bun loads .env).
 */
import {ensureContextManager} from "otel-bun";
import {NodeSDK} from "@opentelemetry/sdk-node";
import {LangfuseSpanProcessor} from "@langfuse/otel";

ensureContextManager()

// The JWT travels through the model context by design (ADR 0001), so it appears in tool inputs/outputs and
// model messages. Redact it before export so traces never hold a replayable credential (valid for 15 minutes).
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g

export function redactJwts(data: unknown): unknown {
  if (typeof data === 'string') return data.replace(JWT_PATTERN, '[REDACTED_JWT]')
  if (Array.isArray(data)) return data.map(redactJwts)
  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, redactJwts(v)]))
  }
  return data
}

export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  environment: process.env.LANGFUSE_TRACING_ENVIRONMENT,
  mask: ({data}) => redactJwts(data),
})

export const sdk = new NodeSDK({spanProcessors: [langfuseSpanProcessor]})
sdk.start()

process.on('SIGTERM', async () => { await sdk.shutdown() })
