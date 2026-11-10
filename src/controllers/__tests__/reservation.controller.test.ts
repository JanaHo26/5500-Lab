import { Request, Response } from "express";
import {
  patchCancelReservation,
  getUserReservations,
} from "../reservation.controller";
import * as service from "../../services/reservation.service";

// controller-only tests: the service is mocked, so no database is involved.
// They cover the branch where a route param arrives as an array, which
// supertest can't produce through the routes we define.
jest.mock("../../services/reservation.service");
const mocked = jest.mocked(service);

function fakeRes(): Response {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

describe("reservation.controller — array route params", () => {
  afterEach(() => jest.resetAllMocks());

  it("cancels using the first id when params.id is an array", async () => {
    mocked.cancelReservation.mockResolvedValue({
      id: "a",
      resourceId: "r",
      userId: "u",
      startTime: "s",
      endTime: "e",
      status: "CANCELLED",
    });
    const res = fakeRes();

    await patchCancelReservation(
      { params: { id: ["a", "b"] } } as unknown as Request,
      res
    );

    expect(mocked.cancelReservation).toHaveBeenCalledWith("a");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("looks up the first userId when params.userId is an array", async () => {
    mocked.getActiveReservationsForUser.mockResolvedValue([]);
    const res = fakeRes();

    await getUserReservations(
      { params: { userId: ["u1", "u2"] } } as unknown as Request,
      res
    );

    expect(mocked.getActiveReservationsForUser).toHaveBeenCalledWith("u1");
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
