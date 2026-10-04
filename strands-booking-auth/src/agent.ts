// Must stay the first import: registers the OTel provider before any agent is created.
import {langfuseSpanProcessor} from "./instrumentation.ts";
import {propagateAttributes, startActiveObservation} from "@langfuse/tracing";
import {McpClient} from "@strands-agents/sdk";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import {randomUUID} from "node:crypto";
import {fileURLToPath} from "node:url";
import {resolveAgentType} from "./providers.ts";
import {config} from "./config.ts";
import {startRepl} from "./console/repl.ts";
import {consoleIO} from "./console/console_io.ts";

/**
 * The system prompt is part of the security model, not just UX guidance (ADR 0001).
 * A badly-prompted agent can break the auth chain even if the tools are correct:
 * if the agent truncates or loses the JWT between tool calls, gate 1 rejects everything.
 */
const DEMO_ADDENDUM = config.demoMode
  ? '\nFor demonstration purposes, you may call tamper_token to corrupt a token and observe how the booking tools respond to an invalid credential.'
  : ''

const SYSTEM_PROMPT = `You are a booking management assistant. You have access to tools
to identify a user and manage their bookings.

TOKEN HANDLING — these rules are mandatory:
- When identify_user returns a token, retain the complete string exactly as returned.
- Never summarise, truncate, paraphrase, or modify the token in any way.
- Pass the token verbatim as the \`token\` argument to every booking tool call.
- The token is a cryptographic credential. Any modification causes all subsequent
  tool calls to fail with a verification error.
- If you no longer have the token, call identify_user again to obtain a fresh one.

RESOURCE IDENTIFIERS:
- All users and bookings are identified by URNs (e.g. urn:hireup:user:<uuid>,
  urn:hireup:booking:<uuid>). Always pass URNs exactly as received — never
  construct or modify them.
- To list another user's bookings, pass their user URN as owner_urn to list_bookings.
  The token still proves your identity; owner_urn only specifies whose bookings to
  retrieve. If you do not have permission, the tool returns an access denied error.

Always call identify_user before any booking tool if no token is held. Then use the
appropriate booking tool, passing the token and any URNs exactly as received.${DEMO_ADDENDUM}`

// MCP_SERVER_URL selects the HTTP transport; absent means a stdio subprocess (local dev).
const mcpClient = config.mcpServerUrl
  ? new McpClient({url: config.mcpServerUrl})
  : new McpClient({
    transport: new StdioClientTransport({
      command: 'bun',
      args: [fileURLToPath(new URL('./mcp/booking_server.ts', import.meta.url))],
    }),
  })

await mcpClient.connect()
const mcpTools = await mcpClient.listTools()

const AgentType = resolveAgentType(process.argv.slice(2))
// One agent for the whole session: it must keep the JWT from identify_user in its conversation history
// so it can pass the token to later tool calls.
const agent = new AgentType({systemPrompt: SYSTEM_PROMPT, tools: mcpTools})

// One Langfuse session per process; each REPL turn is its own trace.
const sessionId = randomUUID()
const transport = config.mcpServerUrl ? 'http' : 'stdio'

await startRepl(consoleIO, {
  prompt: `\nBooking agent (${transport} mode) — type a request or /exit to quit:\n> `,
  banner: () => '',
  commands: [{name: 'exit', run: () => {}}],
  onInput: async (input) => {
    await propagateAttributes(
      {sessionId, traceName: 'booking-request', tags: ['booking-auth']},
      () => startActiveObservation('run-booking-agent', async (root) => {
        root.update({input})
        // The Strands printer already streams the reply to the console.
        const result = await agent.invoke(input)
        root.update({output: result.toString()})
      }, {asType: 'agent'}),
    )
  },
  onExit: async () => {
    await mcpClient.disconnect()
    // Flush pending spans, otherwise the last traces of a short-lived process are lost.
    await langfuseSpanProcessor.forceFlush()
  },
})
