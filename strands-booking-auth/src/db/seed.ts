#!/usr/bin/env bun
/**
 * Seeds the local SQLite database with three users and their bookings.
 *
 * Alice  — full access (read, cancel, reschedule); owns booking-1 and booking-2
 * Bob    — read-only JWT; reader on booking-1 (Alice's); owns booking-3
 * Carol  — full-access JWT but no permission tuples at all
 *
 * Run with: bun src/db/seed.ts
 */
import { SqliteBookingDb } from './sqlite'
import { SqliteFga } from '../fga/sqlite'
import { config } from '../config'

const bookingDb = new SqliteBookingDb(config.sqliteFile)
const fga = new SqliteFga(bookingDb.db)

// UUIDs stored in the DB. URNs are constructed at the application boundary.
const ALICE_ID   = 'a0000000-0000-0000-0000-000000000001'
const BOB_ID     = 'b0000000-0000-0000-0000-000000000002'
const CAROL_ID   = 'c0000000-0000-0000-0000-000000000003'
const BOOKING_1  = 'b0000000-0000-0000-0000-000000000001'
const BOOKING_2  = 'b0000000-0000-0000-0000-000000000002'
const BOOKING_3  = 'b0000000-0000-0000-0000-000000000003'

bookingDb.db.exec('DELETE FROM permissions')
bookingDb.db.exec('DELETE FROM bookings')
bookingDb.db.exec('DELETE FROM users')

const insertUser = bookingDb.db.prepare(
  'INSERT INTO users (user_id, email, full_name, dob, allowed_actions) VALUES (?, ?, ?, ?, ?)'
)
const insertBooking = bookingDb.db.prepare(
  'INSERT INTO bookings (booking_id, scheduled_at, status) VALUES (?, ?, ?)'
)
const insertPermission = fga.prepare(
  'INSERT INTO permissions (subject_id, relation, object_id) VALUES (?, ?, ?)'
)

insertUser.run(ALICE_ID, 'alice@example.com', 'Alice Example', '1990-04-15',
  JSON.stringify(['booking:read', 'booking:cancel', 'booking:reschedule']))
insertUser.run(BOB_ID, 'bob@example.com', 'Bob Example', '1985-08-22',
  JSON.stringify(['booking:read']))
insertUser.run(CAROL_ID, 'carol@example.com', 'Carol Example', '1992-11-30',
  JSON.stringify(['booking:read', 'booking:cancel', 'booking:reschedule']))

// Ownership expressed entirely through permission tuples — no owner column on bookings.
insertBooking.run(BOOKING_1, '2026-09-01T10:00:00+10:00', 'active')
insertBooking.run(BOOKING_2, '2026-09-08T14:00:00+10:00', 'active')
insertBooking.run(BOOKING_3, '2026-09-15T09:00:00+10:00', 'active')

insertPermission.run(ALICE_ID, 'owner',  BOOKING_1)
insertPermission.run(ALICE_ID, 'owner',  BOOKING_2)
insertPermission.run(BOB_ID,   'reader', BOOKING_1)   // Bob can read Alice's booking-1
insertPermission.run(BOB_ID,   'owner',  BOOKING_3)

console.log('Seeded database:')
console.log(`  Alice (${ALICE_ID})`)
console.log(`    owner  → ${BOOKING_1}`)
console.log(`    owner  → ${BOOKING_2}`)
console.log(`  Bob   (${BOB_ID})`)
console.log(`    reader → ${BOOKING_1} (Alice's booking)`)
console.log(`    owner  → ${BOOKING_3}`)
console.log(`  Carol (${CAROL_ID}) — no permission tuples`)