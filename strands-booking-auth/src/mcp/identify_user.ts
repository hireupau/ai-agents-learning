import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { signToken, safeEqual, type Token } from './auth'
import type { UserDb } from '../db/interface'

const IDENTIFY_FAILURE = 'Identity verification failed — check email, date of birth, and full name'

/**
 * Unauthenticated — this is the credential verification step. Any caller can attempt it.
 * All three factors are always checked before returning (enumeration resistance, ADR 0003).
 * Returns a signed HS256 JWT with sub = user URN, actions, exp = now + 15 min.
 */
async function handleIdentifyUser(
  { email, dob, fullName }: { email: string; dob: string; fullName: string },
  users: UserDb,
) {
  const user = await users.getUserByEmail(email)

  // Evaluate all comparisons unconditionally before branching.
  // Consistent timing whether or not the user exists.
  const dobMatch   = user !== null && safeEqual(user.dob, dob)
  const nameMatch  = user !== null && safeEqual(user.fullName, fullName)
  const userExists = user !== null

  if (!userExists || !dobMatch || !nameMatch) {
    return { content: [{ type: 'text' as const, text: IDENTIFY_FAILURE }], isError: true }
  }

  const token = await signToken(user.userUrn, user.allowedActions)

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        token,
        sub: user.userUrn,
        actions: user.allowedActions,
        message: 'Identity verified. Pass the token verbatim to all booking tools.',
      }),
    }],
  }
}

export function registerIdentifyUser(server: McpServer, users: UserDb) {
  server.registerTool(
    'identify_user',
    {
      description: 'Verify a user\'s identity using three factors: email address, date of birth (YYYY-MM-DD), and full name. All three must match exactly. Returns a signed token that must be passed verbatim to all subsequent booking tools. The token expires in 15 minutes.',
      inputSchema: {
        email: z.string().email().describe('The user\'s email address'),
        dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date of birth in YYYY-MM-DD format'),
        fullName: z.string().min(1).describe('The user\'s full name, exactly as registered'),
      },
    },
    (args) => handleIdentifyUser(args, users),
  )
}