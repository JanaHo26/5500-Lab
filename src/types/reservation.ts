export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

// this is what the request body looks like when someone POSTs a new reservation
export interface ReservationInput {
  resourceId: string;
  userId: string;
  /** ISO 8601 date-time string. */
  startTime: string;
  /** ISO 8601 date-time string. */
  endTime: string;
}

// this is what we send back to the client for a reservation
export interface Reservation {
  id: string;
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}
