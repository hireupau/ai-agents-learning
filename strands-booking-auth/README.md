# strands-booking-auth

Step 5: JWT-as-tool-argument auth. A single Strands agent manages bookings (list, get, cancel, reschedule) through an MCP server over stdio. Every privileged tool verifies a signed JWT itself, so it never trusts a user id supplied by the agent. Langfuse tracing is kept from step 4, with JWTs redacted from traces.

Reference: https://github.com/hireupau/architecture-examples/tree/main/strands-booking-auth

## Authorisation model

Two independent gates. Both must pass.

1. **Gate 1 (JWT, `src/mcp/auth.ts`):** valid HS256 signature, not expired (15 minutes), and the `actions` claim includes the action the tool needs (`booking:read`, `booking:cancel` or `booking:reschedule`). Answers who you are and what you may ask for.
2. **Gate 2 (relationship tuples, `src/fga/`):** a `(subject, relation, booking)` tuple exists (`owner` or `reader`). Answers whether you may act on this specific booking. `Fga` is the seam for a real OpenFGA client.

The caller is always taken from the token's `sub`, never from a tool argument.

| Tool | Gate 1 action | Gate 2 relation |
|---|---|---|
| `identify_user` | none (this is the authentication step) | none |
| `list_bookings` | `booking:read` | any relation to the listed bookings |
| `get_booking` | `booking:read` | `owner` or `reader` |
| `cancel_booking` | `booking:cancel` | `owner` |
| `reschedule_booking` | `booking:reschedule` | `owner` |
| `tamper_token` | none (demo only, needs `DEMO_MODE=true`) | none |

The JWT travels through the model's context on purpose in this step. The system prompt tells the model to pass it back verbatim. Keeping it out of the context is step 6.

## Setup

```bash
bun install
cp .env.example .env
```

Edit `.env`:

- `JWT_SECRET`: required. Generate with `openssl rand -base64 32`.
- `DEMO_MODE=true`: registers the `tamper_token` tool (never enable in production).
- A model provider: `LM_STUDIO_MODEL_ID` for LM Studio (default), or `BEDROCK_MODEL_ID` for Bedrock.

Seed the local SQLite database (`bookings.db`). Re-run it any time to reset booking state:

```bash
bun src/db/seed.ts
```

Optional, for traces: start the local Langfuse stack and set its API keys in `.env`.

```bash
bun run infra:start
```

Run the agent (`bun run dev:bedrock` for Bedrock):

```bash
bun run dev
```

## Seed data

| User | Email | DOB | Full name | Allowed actions |
|---|---|---|---|---|
| Alice | alice@example.com | 1990-04-15 | Alice Example | read, cancel, reschedule |
| Bob | bob@example.com | 1985-08-22 | Bob Example | read only |
| Carol | carol@example.com | 1992-11-30 | Carol Example | read, cancel, reschedule |

| Booking | URN | Tuples |
|---|---|---|
| booking-1 | `urn:hireup:booking:b0000000-0000-0000-0000-000000000001` | Alice owner, Bob reader |
| booking-2 | `urn:hireup:booking:b0000000-0000-0000-0000-000000000002` | Alice owner |
| booking-3 | `urn:hireup:booking:b0000000-0000-0000-0000-000000000003` | Bob owner |

Alice's user URN is `urn:hireup:user:a0000000-0000-0000-0000-000000000001`. Carol has no tuples.

## Demo scenarios

The agent keeps one conversation per run. Restart it (`/exit`, then `bun run dev`) between scenarios so a previous user's token isn't carried over. Scenario 1 changes booking state, so re-seed afterwards.

### 1. Success (Alice)

> I'm Alice. Email alice@example.com, DOB 1990-04-15, full name Alice Example. List my bookings.

Expect `identify_user` then `list_bookings`, returning booking-1 and booking-2. Then:

> Reschedule the first one to 2026-10-01 at 10:00 +10:00

> Cancel the second one

Both succeed. Asking for booking-2 again shows it as cancelled.

### 2. Gate 1 rejects (Bob)

Identify as Bob (bob@example.com, 1985-08-22, Bob Example), then:

> Cancel booking urn:hireup:booking:b0000000-0000-0000-0000-000000000003

Bob owns booking-3, so gate 2 would pass, but his token has no `booking:cancel` claim. Expect `Token does not include required action: booking:cancel`.

### 3. Gate 2 rejects (Carol)

Identify as Carol (carol@example.com, 1992-11-30, Carol Example), then:

> Show me booking urn:hireup:booking:b0000000-0000-0000-0000-000000000001

Her token is valid but she has no permission tuples. Expect `Booking not found or access denied`.

### 4. Tampered token

Identify as Alice, then:

> Tamper my token, then list my bookings with the tampered token.

Expect `Token verification failed: signature verification failed`. The model may hesitate to use a corrupted token, so rephrase if needed. Say "Identify me again" afterwards to get a fresh token.

### 5. Cross-user listing (Bob)

Identify as Bob, then:

> List bookings for urn:hireup:user:a0000000-0000-0000-0000-000000000001

Only booking-1 is returned: Bob is a reader on it and has no relation to Alice's other bookings.

### Extras

- **No identification:** as the first message, ask "List my bookings". The agent should call `identify_user` first and ask for your details.
- **Wrong details:** give Alice's email with a wrong date of birth. The failure message is the same whether the email or a factor is wrong (enumeration resistance).
- **Expired token:** set `jwtExpirySeconds` in `src/config.ts` to `10`, identify, wait, then list. Expect the "has expired" message and the agent to re-identify.
- **Weak prompt:** weaken the token rules in the system prompt in `src/agent.ts`, or use a small model, and see whether the token gets mangled. This is the weakness step 6 addresses.

## Checking traces

1. Open http://localhost:3000 and log in (see `.env.example` for the local user, or sign up and create API keys).
2. Open the session. There is one `booking-request` trace per turn.
3. In the `identify_user` turn and the later tool calls, tokens appear as `[REDACTED_JWT]`. Searching a trace for `eyJ` should find nothing.

Redaction only affects traces; the model still sees the real token. It matches intact JWTs only, so a truncated token would not be masked.

## Layout

- `src/agent.ts`: REPL, system prompt, MCP client, single agent, per-turn Langfuse trace
- `src/instrumentation.ts`: OpenTelemetry and Langfuse setup, JWT redaction
- `src/mcp/`: MCP server (`booking_server.ts`), tools, and gate 1 (`auth.ts`)
- `src/db/`: domain types, URN helpers, SQLite storage, seed script
- `src/fga/`: gate 2 interface and SQLite implementation

## Known limitations

- No rate limiting on `identify_user`
- No JWT secret rotation
- The three-factor identity check is illustrative, not production-grade
- No token revocation: a JWT is valid until expiry even if the user's allowed actions change
- The DynamoDB provider and AWS deployment are not implemented
