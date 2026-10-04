export type UserUrn = `urn:hireup:user:${string}`; // ${string} will be replaced by a UUID
export type BookingUrn = `urn:hireup:booking:${string}`;
export type BookingStatus = 'active' | 'cancelled';

export interface User {
  userUrn: UserUrn;
  email: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  allowedActions: string[];
}

export interface Booking {
  bookingUrn: BookingUrn;
  scheduledAt: string; // ISO 8601 with offset
  status: BookingStatus;
}

export interface UserDb {
  getUserByEmail(email: string): Promise<User | null>;
}

export interface BookingDb {
  getBooking(bookingUrn: BookingUrn): Promise<Booking | null>;

  cancelBooking(bookingUrn: BookingUrn): Promise<boolean>;

  rescheduleBooking(bookingUrn: BookingUrn, newTime: string): Promise<boolean>;
}
