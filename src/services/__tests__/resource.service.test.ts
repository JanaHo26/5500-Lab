import { createResource, listResources } from "../resource.service";
import { ValidationError } from "../../errors/AppError";
import { ResourceInput } from "../../types/resource";

async function seed(): Promise<void> {
  await createResource({ name: "Room 101", type: "ROOM", location: "Snell" });
  await createResource({
    name: "Projector",
    type: "EQUIPMENT",
    location: "Richards",
    isAvailable: false,
  });
  await createResource({ name: "Wet Lab", type: "LAB", location: "ISEC" });
}

describe("resource.service — createResource", () => {
  it("keeps an explicit isAvailable=false", async () => {
    const r = await createResource({
      name: "Camera",
      type: "EQUIPMENT",
      location: "Curry",
      isAvailable: false,
    });
    expect(r.isAvailable).toBe(false);
  });

  it.each<[string, Partial<ResourceInput>]>([
    ["blank name", { name: "   " }],
    ["missing location", { location: undefined }],
    ["unknown type", { type: "KITCHEN" as ResourceInput["type"] }],
    ["non-boolean isAvailable", { isAvailable: "yes" as unknown as boolean }],
  ])("rejects %s", async (_label, override) => {
    const input = {
      name: "Room",
      type: "ROOM",
      location: "Snell",
      ...override,
    } as ResourceInput;
    await expect(createResource(input)).rejects.toBeInstanceOf(
      ValidationError
    );
  });
});

describe("resource.service — listResources filters", () => {
  beforeEach(seed);

  it("returns everything with no filters", async () => {
    expect(await listResources()).toHaveLength(3);
  });

  it("filters by type", async () => {
    const result = await listResources("LAB");
    expect(result.map((r) => r.name)).toEqual(["Wet Lab"]);
  });

  it("filters by isAvailable", async () => {
    const result = await listResources(undefined, "false");
    expect(result.map((r) => r.name)).toEqual(["Projector"]);
  });

  it("combines type and isAvailable", async () => {
    expect(await listResources("EQUIPMENT", "true")).toEqual([]);
  });

  it.each(["", "   ", "room", "KITCHEN"])(
    "rejects type=%j",
    async (type) => {
      await expect(listResources(type)).rejects.toBeInstanceOf(
        ValidationError
      );
    }
  );

  it.each(["TRUE", "1", "yes", ""])(
    "rejects isAvailable=%j",
    async (value) => {
      await expect(listResources(undefined, value)).rejects.toThrow(
        'isAvailable must be either "true" or "false".'
      );
    }
  );
});
