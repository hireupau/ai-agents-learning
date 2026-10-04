#!/usr/bin/env bun
/**
 * MCP server entry point. Transport is controlled by the TRANSPORT env var:
 *   stdio (default) — spawned as a subprocess by agent.ts for local development
 *   http            — HTTP server for the deployed AWS path (phase 2)
 *
 * Tools are registered via closure injection. The DB instance is created here
 * and passed into each register* function. No module-level singletons.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer } from 'node:http'
import { config } from '../config'
import { SqliteBookingDb } from '../db/sqlite'
import { SqliteFga } from '../fga/sqlite'
import { registerIdentifyUser } from './identify_user'
import { registerBookingTools } from './bookings'
import { registerTamperTool } from './tamper'

const server = new McpServer({ name: 'booking-auth-demo', version: '1.0.0' });

const { users, bookings, fga } = (() => {
  if (config.dbProvider === 'sqlite') {
    const db = new SqliteBookingDb(config.sqliteFile)
    return { users: db, bookings: db, fga: new SqliteFga(db.db) }
  }
  // DynamoDB implementation deferred to phase 2
  throw new Error('DynamoDB provider not yet implemented (phase 2)')
})()

registerIdentifyUser(server, users)
registerBookingTools(server, bookings, fga)

if (config.demoMode) {
  registerTamperTool(server)
  console.error('[booking-server] DEMO_MODE=true — tamper_token tool is registered. Never enable in production.')
}

if (config.transport === 'stdio') {
  const transport = new StdioServerTransport()
  await server.connect(transport)
} else {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

  const httpServer = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }
    await transport.handleRequest(req, res)
  })

  httpServer.listen(config.port, () => {
    console.error(`[booking-server] HTTP transport listening on port ${config.port}`)
  })
}