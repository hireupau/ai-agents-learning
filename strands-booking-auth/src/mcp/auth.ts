import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config';
import type {BookingUrn, UserUrn} from "../db/interface.ts";

export interface TokenClaims {
  sub: UserUrn
  actions: string[]
  exp: number
  iat: number
}

/** Branded type for a raw JWT string. Produced by signToken, consumed by verifyToken/requireToken. */
export type Token = string & { readonly __brand: 'Token' }

export class TokenVerificationError extends Error {
  constructor(message = 'Token verification failed') {
    super(message)
    this.name = 'TokenVerificationError'
  }
}

export class TokenExpiredError extends TokenVerificationError {
  constructor() {
    super('Token has expired — call identify_user to obtain a fresh token')
    this.name = 'TokenExpiredError'
  }
}

export class InsufficientActionsError extends TokenVerificationError {
  constructor(required: string) {
    super(`Token does not include required action: ${required}`)
    this.name = 'InsufficientActionsError'
  }
}

const URN_PATTERN = /^urn:hireup:(user|booking):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export type UrnType = 'user' | 'booking';

export function parseUrn(urn: string, expectedType: 'user'): UserUrn
export function parseUrn(urn: string, expectedType: 'booking'): BookingUrn
export function parseUrn(urn: string, expectedType: UrnType): UserUrn | BookingUrn {
  const match = URN_PATTERN.exec(urn);
  if (!match) {
    throw new Error(`Invalid URN format: "${urn}". Expected urn:hireup:(user|booking):<uuid>`)
  }
  const [, type] = match;
  if (type !== expectedType) {
    throw new Error(`URN type mismatch: expected "${expectedType}", got "${type}" in "${urn}"`)
  }
  return urn as UserUrn | BookingUrn;
}

export async function signToken(sub: UserUrn, actions: string[]): Promise<Token> {
  const raw = await new SignJWT({ actions })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${config.jwtExpirySeconds}s`)
    .sign(config.jwtSecret)
  return raw as Token
}

/**
 * Gate 1 of the two-gate authorisation model. Validates HS256 signature,
 * expiry, and that `requiredAction` is present in the `actions` claim.
 *
 * @throws {TokenExpiredError} if the token has expired
 * @throws {TokenVerificationError} if the signature is invalid or malformed
 * @throws {InsufficientActionsError} if the required action is not present
 */
export async function verifyToken(token: Token, requiredAction: string): Promise<TokenClaims> {
  let payload: Record<string, unknown>

  try {
    const result = await jwtVerify(token, config.jwtSecret, { algorithms: ['HS256'] })
    payload = result.payload as Record<string, unknown>
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      throw new TokenExpiredError()
    }
    throw new TokenVerificationError(
      `Token verification failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  const actions = payload['actions']
  if (!Array.isArray(actions) || !actions.includes(requiredAction)) {
    throw new InsufficientActionsError(requiredAction)
  }

  return {
    sub: payload['sub'] as UserUrn,
    actions: actions as string[],
    exp: payload['exp'] as number,
    iat: payload['iat'] as number,
  }
}

/**
 * Tool-layer wrapper around verifyToken. Returns a result-style object on failure
 * instead of throwing, eliminating the try/catch boilerplate in every handler.
 */
export async function requireToken(
  token: Token,
  requiredAction: string,
): Promise<{ ok: true; claims: TokenClaims } | { ok: false; error: string }> {
  try {
    const claims = await verifyToken(token, requiredAction)
    return { ok: true, claims }
  } catch (err) {
    return { ok: false, error: err instanceof TokenVerificationError ? err.message : 'Token verification failed' }
  }
}

/**
 * Constant-time string equality. Prevents timing attacks where an attacker
 * could infer a partial match. Defense-in-depth: rate limiting is the primary mitigation.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Different lengths — dummy comparison against self to avoid short-circuit timing leak.
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/**
 * Corrupts the JWT signature by flipping the first character. FOR DEMONSTRATION
 * PURPOSES ONLY — shows learners what gate 1 looks like when it fires.
 * NEVER expose this utility in production.
 */
export function tamperToken(token: Token): Token {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[2]) {
    throw new Error('Not a valid JWT structure')
  }
  const sig = parts[2]
  return (parts[0] + '.' + parts[1] + '.' + (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1)) as Token
}
