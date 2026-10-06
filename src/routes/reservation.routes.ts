import { Router } from "express";
import {
  postReservation,
  getUserReservations,
} from "../controllers/reservation.controller";

const router: Router = Router();

router.post("/reservations", postReservation);
router.get("/reservations/user/:userId", getUserReservations);

export default router;
