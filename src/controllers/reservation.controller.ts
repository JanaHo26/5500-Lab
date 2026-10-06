import { Request, Response, NextFunction } from "express";
import {
  createReservation,
  getActiveReservationsForUser,
  ValidationError,
  ConflictError,
} from "../services/reservation.service";
import { ReservationDTO } from "../types/reservation";
import { ErrorResponse } from "../types/common";

// POST /api/v1/reservations
export function postReservation(
  req: Request,
  res: Response<ReservationDTO | ErrorResponse>,
  next: NextFunction
): void {
  createReservation(req.body)
    .then((reservation) => {
      res.status(201).json(reservation);
    })
    .catch((error) => {
      if (error instanceof ConflictError) {
        res.status(409).json({ code: error.code, message: error.message });
        return;
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ code: error.code, message: error.message });
        return;
      }
      next(error);
    });
}

// GET /api/v1/reservations/user/:userId
export function getUserReservations(
  req: Request,
  res: Response<ReservationDTO[] | ErrorResponse>,
  next: NextFunction
): void {
  const rawUserId = req.params.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

  getActiveReservationsForUser(userId)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((error) => {
      next(error);
    });
}
