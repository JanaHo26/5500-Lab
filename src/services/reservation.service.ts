import { Types } from "mongoose";
import { Reservation, ReservationStatus } from "../models/Reservation.model";
import { Resource } from "../models/Resource.model";
import { ReservationInput, ReservationDTO } from "../types/reservation";

export class ValidationError extends Error {
  code = "VALIDATION_ERROR";
}

export class ConflictError extends Error {
  code = "DOUBLE_BOOKING";
}

export class NotFoundError extends Error {
  code = "NOT_FOUND";
}

// only these statuses hold a time slot; a CANCELLED one frees it up again
const blockingStatuses: ReservationStatus[] = ["PENDING", "CONFIRMED"];

function toDTO(doc: {
  _id: unknown;
  resourceId: unknown;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
}): ReservationDTO {
  return {
    id: String(doc._id),
    resourceId: String(doc.resourceId),
    userId: doc.userId,
    startTime: doc.startTime.toISOString(),
    endTime: doc.endTime.toISOString(),
    status: doc.status,
  };
}

function isRealDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export async function createReservation(
  input: ReservationInput
): Promise<ReservationDTO> {
  const resourceId = input.resourceId;
  const userId = input.userId;
  const startTime = input.startTime;
  const endTime = input.endTime;

  if (!resourceId || !userId) {
    throw new ValidationError("resourceId and userId are required.");
  }

  if (!isRealDate(startTime) || !isRealDate(endTime)) {
    throw new ValidationError("startTime and endTime must be valid dates.");
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start.getTime() >= end.getTime()) {
    throw new ValidationError("startTime must be before endTime.");
  }

  const resourceExists = await Resource.findById(resourceId);
  if (!resourceExists) {
    throw new ValidationError("No resource found with id " + resourceId);
  }

  // two time ranges overlap if one starts before the other ends
  const overlapping = await Reservation.findOne({
    resourceId: resourceId,
    status: { $in: blockingStatuses },
    startTime: { $lt: end },
    endTime: { $gt: start },
  });

  if (overlapping) {
    throw new ConflictError("Resource is already reserved for this time slot.");
  }

  const created = await Reservation.create({
    resourceId: resourceId,
    userId: userId,
    startTime: start,
    endTime: end,
    status: "PENDING",
  });

  return toDTO(created);
}

export async function cancelReservation(id: string): Promise<ReservationDTO> {
  // an id that isn't a valid ObjectId can't match anything, so treat it as missing
  if (!Types.ObjectId.isValid(id)) {
    throw new NotFoundError("No reservation found with id " + id);
  }

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new NotFoundError("No reservation found with id " + id);
  }

  // cancelling twice is not an error, just hand back what's already there
  if (reservation.status === "CANCELLED") {
    return toDTO(reservation);
  }

  reservation.status = "CANCELLED";
  await reservation.save();

  return toDTO(reservation);
}

export async function getActiveReservationsForUser(
  userId: string
): Promise<ReservationDTO[]> {
  const results = await Reservation.find({
    userId: userId,
    status: { $ne: "CANCELLED" },
  });
  return results.map(toDTO);
}
