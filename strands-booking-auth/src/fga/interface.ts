import type { UserUrn, BookingUrn } from '../db/interface'

/**
 * Relation types in the ReBAC permission model.
 * A permission tuple is (subject, relation, object):
 *   - 'owner'  — full control: read, cancel, reschedule
 *   - 'reader' — read-only access
 */
export type Relation = 'owner' | 'reader'

/**
 * Fine-grained authorisation interface — gate 2 of the two-gate auth model.
 *
 * This is the OpenFGA seam. The SQLite implementation stores tuples locally.
 * To use a real FGA service, implement this interface against fgaClient:
 *
 *   check(subject, relation, object) → fgaClient.check({ user: subject, relation, object })
 *   listObjects(subject, relation)   → fgaClient.listObjects({ user: subject, relation, type: 'booking' })
 */
export interface Fga {
  /**
   * Returns true if the tuple (subject, relation, object) exists.
   * Equivalent to fgaClient.check({ user: subject, relation, object: object }).
   */
  check(subject: UserUrn, relation: Relation, object: BookingUrn): Promise<boolean>

  /**
   * Returns all booking URNs where a tuple (subject, *, booking) exists.
   * If ownerSubject is provided, further filters to bookings that ownerSubject owns.
   * Equivalent to fgaClient.listObjects() with an optional intersection filter.
   */
  listAccessibleBookings(subject: UserUrn, ownerSubject?: UserUrn): Promise<BookingUrn[]>
}