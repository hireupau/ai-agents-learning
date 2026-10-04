import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { tamperToken, type Token } from './auth'

/**
 * FOR DEMONSTRATION PURPOSES ONLY. Corrupts the JWT signature so gate 1 fires
 * on the next booking tool call. Never registered unless DEMO_MODE=true.
 */
async function handleTamperToken({ token }: { token: Token }) {
  const corrupted = tamperToken(token)
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        tamperedToken: corrupted,
        message: 'Signature has been corrupted. Pass this token to any booking tool to see gate 1 reject it.',
      }),
    }],
  }
}

export function registerTamperTool(server: McpServer) {
  server.registerTool(
    'tamper_token',
    {
      description: '[DEMO ONLY] Corrupts the signature of a JWT to simulate tampering. Use the returned token with any booking tool to observe gate 1 (token verification) rejecting it. This tool does not exist in production.',
      inputSchema: {
        token: z.string().transform(s => s as Token).describe('A valid JWT returned by identify_user'),
      },
    },
    handleTamperToken,
  )
}