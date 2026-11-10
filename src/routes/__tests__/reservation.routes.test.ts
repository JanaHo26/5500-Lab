import request from "supertest";
import { Types } from "mongoose";
import app from "../../app";
import { createResource } from "../../services/resource.service";

const START = "2026-12-01T10:00:00.000Z";
const END = "2026-12-01T11:00:00.000Z";

async function makeRoom(): Promise<string> {
  const room = await createResource({
    name: "Room 101",
    type: "ROOM",
    location: "Snell Library",
  });
  return room.id;
}

describe("GET /api/v1/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });
});

describe("POST /api/v1/reservations", () => {
  let resourceId: string;

  beforeEach(async () => {
    resourceId = await makeRoom();
  });

  it("returns 201 Created with the new reservation", async () => {
    const res = await request(app)
      .post("/api/v1/reservations")
      .send({ resourceId, userId: "user-1", startTime: START, endTime: END });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      resourceId,
      userId: "user-1",
      startTime: START,
      endTime: END,
      status: "PENDING",
    });
  });

  it("returns 409 Conflict for an overlapping booking", async () => {
    await request(app)
      .post("/api/v1/reservations")
      .send({ resourceId, userId: "user-1", startTime: START, endTime: END })
      .expect(201);

    const res = await request(app).post("/api/v1/reservations").send({
      resourceId,
      userId: "user-2",
      startTime: "2026-12-01T10:30:00.000Z",
      endTime: "2026-12-01T11:30:00.000Z",
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      code: "DOUBLE_BOOKING",
      message: "Resource is already reserved for this time slot.",
    });
  });

  it("returns 400 when endTime is before startTime", async () => {
    const res = await request(app)
      .post("/api/v1/reservations")
      .send({ resourceId, userId: "user-1", startTime: END, endTime: START });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for an empty body", async () => {
    const res = await request(app).post("/api/v1/reservations").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed resourceId instead of 500", async () => {
    const res = await request(app)
      .post("/api/v1/reservations")
      .send({ resourceId: "xyz", userId: "u", startTime: START, endTime: END });
    expect(res.status).toBe(400);
  });

  it("returns 400 (not 500) when the request has no JSON body at all", async () => {
    const res = await request(app).post("/api/v1/reservations");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when the body is not JSON", async () => {
    const res = await request(app)
      .post("/api/v1/reservations")
      .set("Content-Type", "text/plain")
      .send("resourceId=1");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/reservations/:id/cancel", () => {
  it("returns 200 with the cancelled reservation", async () => {
    const resourceId = await makeRoom();
    const created = await request(app)
      .post("/api/v1/reservations")
      .send({ resourceId, userId: "user-1", startTime: START, endTime: END });

    const res = await request(app).patch(
      `/api/v1/reservations/${created.body.id}/cancel`
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
  });

  it("returns 404 for an unknown reservation", async () => {
    const res = await request(app).patch(
      `/api/v1/reservations/${new Types.ObjectId().toString()}/cancel`
    );
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/v1/reservations/user/:userId", () => {
  it("returns 200 with only that user's active reservations", async () => {
    const resourceId = await makeRoom();
    await request(app)
      .post("/api/v1/reservations")
      .send({ resourceId, userId: "user-1", startTime: START, endTime: END });

    const res = await request(app).get("/api/v1/reservations/user/user-1");
    const empty = await request(app).get("/api/v1/reservations/user/nobody");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(empty.body).toEqual([]);
  });
});
