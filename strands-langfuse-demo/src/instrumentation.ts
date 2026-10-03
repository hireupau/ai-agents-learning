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

export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  environment: process.env.LANGFUSE_TRACING_ENVIRONMENT,
})

export const sdk = new NodeSDK({spanProcessors: [langfuseSpanProcessor]})
sdk.start()

process.on('SIGTERM', async () => { await sdk.shutdown() })
