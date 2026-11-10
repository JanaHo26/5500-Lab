import request from "supertest";
import app from "../../app";
import { createResource } from "../../services/resource.service";

beforeEach(async () => {
  await createResource({ name: "Room 101", type: "ROOM", location: "Snell" });
  await createResource({
    name: "Room 202",
    type: "ROOM",
    location: "Snell",
    isAvailable: false,
  });
  await createResource({
    name: "Projector",
    type: "EQUIPMENT",
    location: "Richards",
  });
});

describe("GET /api/v1/resources", () => {
  it("returns 200 with every resource when no filters are given", async () => {
    const res = await request(app).get("/api/v1/resources");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it("returns 200 filtered by type", async () => {
    const res = await request(app)
      .get("/api/v1/resources")
      .query({ type: "ROOM" });

    expect(res.status).toBe(200);
    expect(res.body.map((r: { name: string }) => r.name).sort()).toEqual([
      "Room 101",
      "Room 202",
    ]);
  });

  it("returns 200 filtered by type and isAvailable together", async () => {
    const res = await request(app)
      .get("/api/v1/resources")
      .query({ type: "ROOM", isAvailable: "true" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: expect.any(String),
        name: "Room 101",
        type: "ROOM",
        location: "Snell",
        isAvailable: true,
      },
    ]);
  });

  it("returns 400 for an unknown type", async () => {
    const res = await request(app)
      .get("/api/v1/resources")
      .query({ type: "KITCHEN" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for a non-boolean isAvailable", async () => {
    const res = await request(app)
      .get("/api/v1/resources")
      .query({ isAvailable: "maybe" });
    expect(res.status).toBe(400);
  });
});
