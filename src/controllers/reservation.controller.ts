import { Request, Response } from "express";
import {
  createReservation,
  cancelReservation,
  getActiveReservationsForUser,
} from "../services/reservation.service";
import { Reservation as ReservationDTO } from "../types/reservation";
import { ErrorResponse } from "../types/common";

// POST /api/v1/reservations
export async function postReservation(
  req: Request,
  res: Response<ReservationDTO | ErrorResponse>
): Promise<void> {
  const reservation = await createReservation(req.body);
  res.status(201).json(reservation);
}

// PATCH /api/v1/reservations/:id/cancel
export async function patchCancelReservation(
  req: Request,
  res: Response<ReservationDTO | ErrorResponse>
): Promise<void> {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const reservation = await cancelReservation(id);
  res.status(200).json(reservation);
}

// GET /api/v1/reservations/user/:userId
export async function getUserReservations(
  req: Request,
  res: Response<ReservationDTO[] | ErrorResponse>
): Promise<void> {
  const rawUserId = req.params.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

  const result = await getActiveReservationsForUser(userId);
  res.status(200).json(result);
}
