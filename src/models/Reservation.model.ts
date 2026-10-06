import { Schema, model, Document, Types } from "mongoose";

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface IReservation extends Document {
  resourceId: Types.ObjectId;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
}

const reservationSchema = new Schema<IReservation>({
  resourceId: {
    type: Schema.Types.ObjectId,
    ref: "Resource",
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING", "CONFIRMED", "CANCELLED"],
    required: true,
    default: "PENDING",
  },
});

export const Reservation = model<IReservation>(
  "Reservation",
  reservationSchema
);
