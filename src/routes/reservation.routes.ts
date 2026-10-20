import { Router } from "express";
import {
  postReservation,
  patchCancelReservation,
  getUserReservations,
} from "../controllers/reservation.controller";

const router: Router = Router();

router.post("/reservations", postReservation);
router.patch("/reservations/:id/cancel", patchCancelReservation);
router.get("/reservations/user/:userId", getUserReservations);

export default router;
