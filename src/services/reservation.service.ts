import { Types } from "mongoose";
import { Reservation } from "../models/Reservation.model";
import { Resource } from "../models/Resource.model";
import {
  ReservationInput,
  Reservation as ReservationDTO,
  ReservationStatus,
} from "../types/reservation";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
} from "../errors/AppError";

// only these statuses hold a time slot; a CANCELLED one frees it up again
const blockingStatuses: ReservationStatus[] = ["PENDING", "CONFIRMED"];

const doubleBookingMessage = "Resource is already reserved for this time slot.";

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

  // reject a malformed id up front, otherwise the lookup below throws a
  // CastError that would surface as a 500 instead of bad client input
  if (!Types.ObjectId.isValid(resourceId)) {
    throw new ValidationError("resourceId must be a valid resource id.");
  }

  const resourceExists = await Resource.findById(resourceId);
  if (!resourceExists) {
    throw new ValidationError("No resource found with id " + resourceId);
  }

  if (await hasOverlap(resourceId, start, end)) {
    throw new ConflictError(doubleBookingMessage);
  }

  const created = await Reservation.create({
    resourceId: resourceId,
    userId: userId,
    startTime: start,
    endTime: end,
    status: "PENDING",
  });

  // the check above and the insert are two separate steps, so two requests
  // arriving together can both pass the check. Re-check after inserting: if
  // any other active booking overlaps ours, back ours out. Whichever request
  // checks second always sees the other one, so two can never both succeed.
  if (await hasOverlap(resourceId, start, end, created._id)) {
    await Reservation.deleteOne({ _id: created._id });
    throw new ConflictError(doubleBookingMessage);
  }

  return toDTO(created);
}

// two time ranges overlap if one starts before the other ends
async function hasOverlap(
  resourceId: string,
  start: Date,
  end: Date,
  excludeId?: Types.ObjectId
): Promise<boolean> {
  const found = await Reservation.exists({
    resourceId: resourceId,
    status: { $in: blockingStatuses },
    startTime: { $lt: end },
    endTime: { $gt: start },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  return found !== null;
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
