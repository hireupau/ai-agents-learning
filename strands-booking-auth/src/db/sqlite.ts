import { Database } from 'bun:sqlite'
import type { BookingDb, UserDb, User, Booking, BookingStatus, UserUrn, BookingUrn } from './interface'
import { USER_PREFIX, BOOKING_PREFIX, bookingUUID } from './urns'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    user_id         TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    full_name       TEXT NOT NULL,
    dob             TEXT NOT NULL,
    allowed_actions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id   TEXT PRIMARY KEY,
    scheduled_at TEXT NOT NULL,
    status       TEXT NOT NULL
);
`

function rowToUser(row: Record<string, unknown>): User {
  return {
    userUrn: `${USER_PREFIX}${row.user_id}` as UserUrn,
    email: row.email as string,
    fullName: row.full_name as string,
    dob: row.dob as string,
    allowedActions: JSON.parse(row.allowed_actions as string) as string[],
  }
}

function rowToBooking(row: Record<string, unknown>): Booking {
  return {
    bookingUrn: `${BOOKING_PREFIX}${row.booking_id}` as BookingUrn,
    scheduledAt: row.scheduled_at as string,
    status: row.status as BookingStatus,
  }
}

export class SqliteBookingDb implements UserDb, BookingDb {
  readonly db: Database

  constructor(file: string) {
    this.db = new Database(file, { create: true })
    this.db.exec(SCHEMA)
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    return row ? rowToUser(row as Record<string, unknown>) : null
  }

  async getBooking(bookingUrn: BookingUrn): Promise<Booking | null> {
    const row = this.db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingUUID(bookingUrn))
    return row ? rowToBooking(row as Record<string, unknown>) : null
  }

  async cancelBooking(bookingUrn: BookingUrn): Promise<boolean> {
    const result = this.db.prepare(
      'UPDATE bookings SET status = \'cancelled\' WHERE booking_id = ?'
    ).run(bookingUUID(bookingUrn))
    return result.changes > 0
  }

  async rescheduleBooking(bookingUrn: BookingUrn, newTime: string): Promise<boolean> {
    const result = this.db.prepare(
      'UPDATE bookings SET scheduled_at = ? WHERE booking_id = ?'
    ).run(newTime, bookingUUID(bookingUrn))
    return result.changes > 0
  }
}