import { Types } from "mongoose";
import {
  createReservation,
  cancelReservation,
  getActiveReservationsForUser,
} from "../reservation.service";
import { createResource } from "../resource.service";
import { Reservation } from "../../models/Reservation.model";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../errors/AppError";
import { ReservationInput } from "../../types/reservation";

// fixed base time so every boundary below is exact to the millisecond
const BASE = new Date("2026-12-01T10:00:00.000Z").getTime();
const HOUR = 60 * 60 * 1000;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

async function makeRoom(name = "Room 101"): Promise<string> {
  const room = await createResource({
    name,
    type: "ROOM",
    location: "Snell Library",
  });
  return room.id;
}

function slot(
  resourceId: string,
  startMs: number,
  endMs: number,
  userId = "user-1"
): ReservationInput {
  return { resourceId, userId, startTime: iso(startMs), endTime: iso(endMs) };
}

describe("reservation.service — happy path", () => {
  it("creates a resource with isAvailable defaulting to true", async () => {
    const room = await createResource({
      name: "  Lab A  ",
      type: "LAB",
      location: " ISEC ",
    });

    expect(room).toEqual({
      id: expect.any(String),
      name: "Lab A",
      type: "LAB",
      location: "ISEC",
      isAvailable: true,
    });
  });

  it("places a valid reservation as PENDING and saves it", async () => {
    const resourceId = await makeRoom();

    const created = await createReservation(
      slot(resourceId, BASE, BASE + HOUR)
    );

    expect(created).toEqual({
      id: expect.any(String),
      resourceId,
      userId: "user-1",
      startTime: iso(BASE),
      endTime: iso(BASE + HOUR),
      status: "PENDING",
    });
    expect(await Reservation.countDocuments()).toBe(1);
  });

  it("cancels a reservation and keeps it cancelled when cancelled again", async () => {
    const resourceId = await makeRoom();
    const created = await createReservation(
      slot(resourceId, BASE, BASE + HOUR)
    );

    const cancelled = await cancelReservation(created.id);
    expect(cancelled.status).toBe("CANCELLED");

    const again = await cancelReservation(created.id);
    expect(again).toEqual(cancelled);
  });

  it("lists only a user's non-cancelled reservations", async () => {
    const resourceId = await makeRoom();
    const keep = await createReservation(slot(resourceId, BASE, BASE + HOUR));
    const drop = await createReservation(
      slot(resourceId, BASE + 2 * HOUR, BASE + 3 * HOUR)
    );
    await createReservation(
      slot(resourceId, BASE + 4 * HOUR, BASE + 5 * HOUR, "someone-else")
    );
    await cancelReservation(drop.id);

    const result = await getActiveReservationsForUser("user-1");

    expect(result.map((r) => r.id)).toEqual([keep.id]);
  });
});

describe("reservation.service — double booking boundaries", () => {
  let resourceId: string;

  beforeEach(async () => {
    resourceId = await makeRoom();
    await createReservation(slot(resourceId, BASE, BASE + HOUR));
  });

  it("rejects a booking with exactly the same start and end", async () => {
    await expect(
      createReservation(slot(resourceId, BASE, BASE + HOUR, "user-2"))
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows a booking that starts exactly when the existing one ends", async () => {
    await expect(
      createReservation(slot(resourceId, BASE + HOUR, BASE + 2 * HOUR))
    ).resolves.toMatchObject({ status: "PENDING" });
  });

  it("allows a booking that ends exactly when the existing one starts", async () => {
    await expect(
      createReservation(slot(resourceId, BASE - HOUR, BASE))
    ).resolves.toMatchObject({ status: "PENDING" });
  });

  it("rejects a booking that overlaps the end by 1 millisecond", async () => {
    await expect(
      createReservation(slot(resourceId, BASE + HOUR - 1, BASE + 2 * HOUR))
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a booking that overlaps the start by 1 millisecond", async () => {
    await expect(
      createReservation(slot(resourceId, BASE - HOUR, BASE + 1))
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a booking fully inside the existing one", async () => {
    await expect(
      createReservation(slot(resourceId, BASE + 1, BASE + HOUR - 1))
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a booking that fully covers the existing one", async () => {
    await expect(
      createReservation(slot(resourceId, BASE - 1, BASE + HOUR + 1))
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows the same time slot on a different resource", async () => {
    const otherRoom = await makeRoom("Room 202");
    await expect(
      createReservation(slot(otherRoom, BASE, BASE + HOUR))
    ).resolves.toMatchObject({ resourceId: otherRoom });
  });

  it("frees the slot again once the existing booking is cancelled", async () => {
    const [existing] = await getActiveReservationsForUser("user-1");
    await cancelReservation(existing.id);

    await expect(
      createReservation(slot(resourceId, BASE, BASE + HOUR, "user-2"))
    ).resolves.toMatchObject({ userId: "user-2" });
  });

  it("never lets two of five simultaneous identical requests both win", async () => {
    const results = await Promise.allSettled(
      [1, 2, 3, 4, 5].map((n) =>
        createReservation(
          slot(resourceId, BASE + 5 * HOUR, BASE + 6 * HOUR, `user-${n}`)
        )
      )
    );

    const wins = results.filter((r) => r.status === "fulfilled");
    expect(wins.length).toBeLessThanOrEqual(1);
    for (const r of results) {
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(ConflictError);
      }
    }

    const stored = await Reservation.countDocuments({
      startTime: new Date(BASE + 5 * HOUR),
      status: { $ne: "CANCELLED" },
    });
    expect(stored).toBe(wins.length);
  });
});

describe("reservation.service — race back-out", () => {
  afterEach(() => jest.restoreAllMocks());

  it("removes its own booking if a clash appears after the first check", async () => {
    const resourceId = await makeRoom();
    await createReservation(slot(resourceId, BASE, BASE + HOUR));

    // simulate losing the race: the pre-insert check misses the existing
    // booking, exactly like a request that checked before the other inserted
    const realExists = Reservation.exists.bind(Reservation);
    jest
      .spyOn(Reservation, "exists")
      .mockResolvedValueOnce(null)
      .mockImplementation(realExists);

    await expect(
      createReservation(slot(resourceId, BASE, BASE + HOUR, "user-2"))
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await Reservation.countDocuments({ userId: "user-2" })).toBe(0);
  });
});

describe("reservation.service — invalid input", () => {
  let resourceId: string;

  beforeEach(async () => {
    resourceId = await makeRoom();
  });

  it("rejects endTime before startTime (negative range)", async () => {
    await expect(
      createReservation(slot(resourceId, BASE + HOUR, BASE))
    ).rejects.toThrow(new ValidationError("startTime must be before endTime."));
  });

  it("rejects a zero-length reservation", async () => {
    await expect(
      createReservation(slot(resourceId, BASE, BASE))
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it.each([
    ["not-a-date", iso(BASE)],
    [iso(BASE), "2026-13-45T99:00:00Z"],
    ["", iso(BASE)],
  ])("rejects unparseable dates (%s, %s)", async (startTime, endTime) => {
    await expect(
      createReservation({ resourceId, userId: "user-1", startTime, endTime })
    ).rejects.toThrow("startTime and endTime must be valid dates.");
  });

  it.each(["resourceId", "userId"] as const)(
    "rejects a payload missing %s",
    async (field) => {
      const input: Partial<ReservationInput> = slot(
        resourceId,
        BASE,
        BASE + HOUR
      );
      delete input[field];

      await expect(
        createReservation(input as ReservationInput)
      ).rejects.toThrow("resourceId and userId are required.");
    }
  );

  it("rejects a resourceId that is not a valid ObjectId", async () => {
    await expect(
      createReservation(slot("abc123", BASE, BASE + HOUR))
    ).rejects.toThrow("resourceId must be a valid resource id.");
  });

  it("rejects a well-formed resourceId that does not exist", async () => {
    const missing = new Types.ObjectId().toString();
    await expect(
      createReservation(slot(missing, BASE, BASE + HOUR))
    ).rejects.toThrow("No resource found with id " + missing);
    expect(await Reservation.countDocuments()).toBe(0);
  });

  it("returns NotFound when cancelling a reservation that does not exist", async () => {
    await expect(
      cancelReservation(new Types.ObjectId().toString())
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns NotFound when cancelling with a malformed id", async () => {
    await expect(cancelReservation("not-an-id")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
