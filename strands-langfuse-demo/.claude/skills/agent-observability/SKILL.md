---
name: agent-observability
description: Instrument agents with OpenTelemetry and Langfuse for tracing, prompt management, and dataset evaluation. Use when adding observability to an agent example, setting up Langfuse tracing, managing prompts via Langfuse, creating eval datasets, or wiring an LLM-as-judge.
disable-model-invocation: true
---

# Agent Observability: OTel + Langfuse

Reference example: `strands-langfuse-demo/`

## Key principle

Instrumentation must be the **first import** in every entry point. Without this, OTel context propagation fails silently in Bun — all spans appear as top-level traces with no parent/child relationships.

## Setup

### Dependencies

```json
{
  "@langfuse/client": "^5.9.0",
  "@langfuse/otel": "^5.7.0",
  "@langfuse/tracing": "^5.5.3",
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/sdk-node": "^0.219.0",
  "otel-bun": "^0.3.0"
}
```

### src/instrumentation.ts

```typescript
// MUST be the first import in every entry point
import { ensureContextManager } from 'otel-bun'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { LangfuseSpanProcessor } from '@langfuse/otel'

// Bun uses AsyncLocalStorage but OTel doesn't auto-detect it outside Node.
// ensureContextManager() installs the ALS context manager before SDK starts.
ensureContextManager()

export const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
})
sdk.start()
process.on('SIGTERM', async () => { await sdk.shutdown() })
```

### src/langfuse.ts — singleton client

```typescript
import { LangfuseClient } from '@langfuse/client'

export const langfuseClient = new LangfuseClient()

// Fetch prompt with 60s cache + fallback for resilience
export async function getPrompt(name: string, fallback: string): Promise<string> {
  try {
    const p = await langfuseClient.prompt.get(name, { cacheTtlSeconds: 60, label: 'production', fallback })
    return p.compile({})
  } catch (err) {
    console.warn(`[langfuse] Could not fetch "${name}", using fallback`)
    return fallback
  }
}
```

### Entry point

```typescript
import './instrumentation'  // FIRST import, always
import { langfuseClient } from './langfuse'
// ... rest of imports ...

// At the end, flush before exit
await langfuseClient.flush()
await mcpClient.disconnect()
```

## Prompt management

Store agent system prompts in Langfuse (label: `production`). Always provide a hardcoded fallback so the agent runs without a Langfuse connection.

```typescript
const systemPrompt = await getPrompt('my-agent-system', FALLBACK_PROMPT)
const agent = new AgentType({ systemPrompt, tools })
```

Seed prompts idempotently via a seed script:
```typescript
// scripts/seed-prompts.ts
await langfuseClient.prompt.create({
  name: 'my-agent-system',
  prompt: DEFAULT_PROMPT,
  labels: ['production'],
  type: 'text',
})
```

## Dataset evaluation

```typescript
// scripts/eval.ts
import '../src/instrumentation'  // first import

const dataset = await langfuseClient.dataset.get('my-eval-dataset')
const runName = `run-${new Date().toISOString().slice(0, 16)}`

for (const item of dataset.items) {
  const { span, ...result } = await runPipeline(agents, item.input.query, 'eval-run')
  await item.link({ otelSpan: span.otelSpan }, runName)

  const correct = /* compare result to item.expectedOutput */
  await langfuseClient.score.create({
    traceId: span.traceId,
    name: 'correctness',
    value: correct ? 1 : 0,
    dataType: 'BOOLEAN',
  })
}

await langfuseClient.flush()
```

Score data types:
- `BOOLEAN` — pass/fail (0 or 1). Use for correctness checks.
- `NUMERIC` — continuous range. Use for quality scores from LLM-as-judge.

## Docker Compose (Langfuse local stack)

```yaml
# The Langfuse local stack requires: ClickHouse, Postgres, Redis, MinIO, langfuse-web, langfuse-worker
# Use the docker-compose.yml from strands-langfuse-demo/ as a template.
# Bootstrap: just infra:start (or colima start --cpu 4 --memory 16 && docker compose up -d)
# The stack needs ≥4 CPU / ≥16 GiB memory.
```

## Checklist

```
- [ ] src/instrumentation.ts created; ensureContextManager() called before NodeSDK
- [ ] instrumentation.ts is the FIRST import in every entry point (agent.ts, eval.ts)
- [ ] src/langfuse.ts exports singleton langfuseClient and getPrompt()
- [ ] langfuseClient.flush() called before process exit
- [ ] All system prompts fetched via getPrompt() with hardcoded fallbacks
- [ ] Seed script creates prompts with label 'production'
- [ ] Eval script uses 'eval-run' trace name; interactive uses 'pipeline-run'
- [ ] Dataset items have stable IDs for idempotent upsert
- [ ] Scores use BOOLEAN or NUMERIC dataType explicitly
```

## Anti-patterns

- Do not put instrumentation anywhere other than the first import line of each entry point
- Do not omit the fallback string from getPrompt() — the agent must work without Langfuse
- Do not use raw model-generated text as an eval score — parse structured output first
- Do not forget `langfuseClient.flush()` before exit — traces will be lost