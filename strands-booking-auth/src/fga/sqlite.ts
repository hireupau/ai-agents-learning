import { Database } from 'bun:sqlite'
import type { UserUrn, BookingUrn } from '../db/interface'
import type { Fga, Relation } from './interface'
import { userUUID, bookingUUID, toBookingUrn } from '../db/urns'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS permissions (
    -- ReBAC permission tuples: (subject, relation, object).
    -- This is the FGA seam — replace SqliteFga with an fgaClient adapter for production.
    subject_id  TEXT NOT NULL,
    relation    TEXT NOT NULL,  -- 'owner' | 'reader'
    object_id   TEXT NOT NULL,
    PRIMARY KEY (subject_id, relation, object_id)
);

CREATE INDEX IF NOT EXISTS permissions_subject ON permissions (subject_id);
`

export class SqliteFga implements Fga {
  private db: Database

  constructor(db: Database) {
    this.db = db
    this.db.exec(SCHEMA)
  }

  async check(subject: UserUrn, relation: Relation, object: BookingUrn): Promise<boolean> {
    const row = this.db.prepare(
      'SELECT 1 FROM permissions WHERE subject_id = ? AND relation = ? AND object_id = ?'
    ).get(userUUID(subject), relation, bookingUUID(object))
    return row !== null
  }

  async listAccessibleBookings(subject: UserUrn, ownerSubject?: UserUrn): Promise<BookingUrn[]> {
    const subjectId = userUUID(subject)

    if (ownerSubject && ownerSubject !== subject) {
      // Intersection: bookings where subject has any relation AND ownerSubject is 'owner'.
      const ownerId = userUUID(ownerSubject)
      const rows = this.db.prepare(`
                SELECT p_subject.object_id
                FROM permissions p_subject
                INNER JOIN permissions p_owner
                    ON p_owner.object_id = p_subject.object_id
                    AND p_owner.subject_id = ?
                    AND p_owner.relation = 'owner'
                WHERE p_subject.subject_id = ?
            `).all(ownerId, subjectId) as Array<{ object_id: string }>
      return rows.map(r => toBookingUrn(r.object_id))
    }

    const effectiveId = ownerSubject ? userUUID(ownerSubject) : subjectId
    const rows = this.db.prepare(
      'SELECT object_id FROM permissions WHERE subject_id = ?'
    ).all(effectiveId) as Array<{ object_id: string }>
    return rows.map(r => toBookingUrn(r.object_id))
  }

  /** Exposed for the seed script. */
  prepare(sql: string) { return this.db.prepare(sql) }
}