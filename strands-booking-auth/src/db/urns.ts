import type {BookingUrn, UserUrn} from "./interface.ts";

export const USER_PREFIX = 'urn:hireup:user:';
export const BOOKING_PREFIX = 'urn:hireup:booking:';

export const userUUID = (urn: UserUrn): string => urn.slice(USER_PREFIX.length);
export const bookingUUID = (urn: BookingUrn): string => urn.slice(BOOKING_PREFIX.length);
export const toUserUrn = (uuid: string): UserUrn => `${USER_PREFIX}${uuid}` as UserUrn;
export const toBookingUrn = (uuid: string): BookingUrn => `${BOOKING_PREFIX}${uuid}` as BookingUrn;