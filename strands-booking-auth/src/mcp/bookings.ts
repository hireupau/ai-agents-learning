import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { requireToken, parseUrn, type Token } from './auth'
import type { BookingDb, BookingUrn, UserUrn } from '../db/interface'
import type { Fga } from '../fga/interface'

type ToolResult = { content: [{ type: 'text'; text: string }]; isError?: true }

function ok(text: string): ToolResult {
  return { content: [{ type: 'text', text }] }
}

function err(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true }
}

// Returned for any access denial or missing resource — intentionally identical
// to prevent callers from enumerating valid booking URNs (ADR 0002).
const ACCESS_DENIED = 'Booking not found or access denied'

const tokenField      = z.string().transform(s => s as Token).describe('JWT returned by identify_user — pass verbatim')
const bookingUrnField = z.string().transform(s => parseUrn(s, 'booking')).describe('Booking URN (urn:hireup:booking:<uuid>)')
const ownerUrnField   = z.string().transform(s => parseUrn(s, 'user')).optional().describe('Optional user URN (urn:hireup:user:<uuid>) — list another user\'s bookings. The caller must have a permission tuple granting access.')

async function handleListBookings(
  { token, ownerUrn }: { token: Token; ownerUrn?: UserUrn },
  bookings: BookingDb,
  fga: Fga,
): Promise<ToolResult> {
  const auth = await requireToken(token, 'booking:read')
  if (!auth.ok) return err(auth.error)

  const urns = await fga.listAccessibleBookings(auth.claims.sub, ownerUrn)
  const found = (await Promise.all(urns.map(urn => bookings.getBooking(urn)))).filter(Boolean)
  return ok(JSON.stringify(found, null, 2))
}

async function handleGetBooking(
  { token, bookingUrn }: { token: Token; bookingUrn: BookingUrn },
  bookings: BookingDb,
  fga: Fga,
): Promise<ToolResult> {
  const auth = await requireToken(token, 'booking:read')
  if (!auth.ok) return err(auth.error)

  const canRead = await fga.check(auth.claims.sub, 'owner', bookingUrn)
    || await fga.check(auth.claims.sub, 'reader', bookingUrn)
  if (!canRead) return err(ACCESS_DENIED)

  const booking = await bookings.getBooking(bookingUrn)
  return booking ? ok(JSON.stringify(booking, null, 2)) : err(ACCESS_DENIED)
}

async function handleCancelBooking(
  { token, bookingUrn }: { token: Token; bookingUrn: BookingUrn },
  bookings: BookingDb,
  fga: Fga,
): Promise<ToolResult> {
  const auth = await requireToken(token, 'booking:cancel')
  if (!auth.ok) return err(auth.error)

  if (!await fga.check(auth.claims.sub, 'owner', bookingUrn)) return err(ACCESS_DENIED)

  const booking = await bookings.getBooking(bookingUrn)
  if (!booking || booking.status !== 'active') return err('Booking is not active and cannot be cancelled')

  const cancelled = await bookings.cancelBooking(bookingUrn)
  return cancelled ? ok(`Booking ${bookingUrn} has been cancelled.`) : err(ACCESS_DENIED)
}

async function handleRescheduleBooking(
  { token, bookingUrn, newTime }: { token: Token; bookingUrn: BookingUrn; newTime: string },
  bookings: BookingDb,
  fga: Fga,
): Promise<ToolResult> {
  const auth = await requireToken(token, 'booking:reschedule')
  if (!auth.ok) return err(auth.error)

  if (!await fga.check(auth.claims.sub, 'owner', bookingUrn)) return err(ACCESS_DENIED)

  const booking = await bookings.getBooking(bookingUrn)
  if (!booking || booking.status !== 'active') return err('Booking is not active and cannot be rescheduled')

  const rescheduled = await bookings.rescheduleBooking(bookingUrn, newTime)
  return rescheduled ? ok(`Booking ${bookingUrn} rescheduled to ${newTime}.`) : err(ACCESS_DENIED)
}

/**
 * Registers the four booking management tools on the MCP server.
 * Every handler follows the same structure: verify token, check FGA, perform action.
 */
export function registerBookingTools(server: McpServer, bookings: BookingDb, fga: Fga) {
  server.registerTool(
    'list_bookings',
    {
      description: 'List bookings accessible to the authenticated user. If owner_urn is omitted, lists the caller\'s own bookings. If owner_urn is provided (e.g. urn:hireup:user:<uuid>), lists bookings owned by that user to which the caller also has access via a permission tuple. Requires booking:read in the token.',
      inputSchema: { token: tokenField, ownerUrn: ownerUrnField },
    },
    (args) => handleListBookings(args, bookings, fga),
  )

  server.registerTool(
    'get_booking',
    {
      description: 'Get details of a specific booking. Requires booking:read and an owner or reader permission tuple.',
      inputSchema: { token: tokenField, bookingUrn: bookingUrnField },
    },
    (args) => handleGetBooking(args, bookings, fga),
  )

  server.registerTool(
    'cancel_booking',
    {
      description: 'Cancel a booking. Requires booking:cancel and an owner permission tuple.',
      inputSchema: { token: tokenField, bookingUrn: bookingUrnField },
    },
    (args) => handleCancelBooking(args, bookings, fga),
  )

  server.registerTool(
    'reschedule_booking',
    {
      description: 'Reschedule a booking to a new time. Requires booking:reschedule and an owner permission tuple.',
      inputSchema: {
        token: tokenField,
        bookingUrn: bookingUrnField,
        newTime: z.string().datetime({ offset: true }).describe('New scheduled time as ISO 8601 with timezone offset, e.g. 2026-09-01T10:00:00+10:00'),
      },
    },
    (args) => handleRescheduleBooking(args, bookings, fga),
  )
}