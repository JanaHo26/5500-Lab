import { QueryFilter, HydratedDocument } from "mongoose";
import { Resource, IResource } from "../models/Resource.model";
import {
  Resource as ResourceDTO,
  ResourceInput,
  ResourceType,
} from "../types/resource";
import { ValidationError } from "../errors/AppError";

const validTypes: ResourceType[] = ["ROOM", "EQUIPMENT", "LAB"];

// turns a mongoose document into the plain shape we send back to the client
function toDTO(doc: HydratedDocument<IResource>): ResourceDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    type: doc.type,
    location: doc.location,
    isAvailable: doc.isAvailable,
  };
}

// query params always arrive as strings, so only the exact strings are accepted
function parseIsAvailable(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ValidationError('isAvailable must be either "true" or "false".');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export async function createResource(
  input: ResourceInput
): Promise<ResourceDTO> {
  if (!isNonEmptyString(input.name) || !isNonEmptyString(input.location)) {
    throw new ValidationError("name and location are required.");
  }

  if (!validTypes.includes(input.type)) {
    throw new ValidationError("type must be one of: ROOM, EQUIPMENT, LAB.");
  }

  if (
    input.isAvailable !== undefined &&
    typeof input.isAvailable !== "boolean"
  ) {
    throw new ValidationError("isAvailable must be a boolean.");
  }

  const created = await Resource.create({
    name: input.name.trim(),
    type: input.type,
    location: input.location.trim(),
    isAvailable: input.isAvailable ?? true,
  });

  return toDTO(created);
}

export async function listResources(
  type?: string,
  isAvailable?: string
): Promise<ResourceDTO[]> {
  const filter: QueryFilter<IResource> = {};

  if (type !== undefined) {
    if (type.trim() === "") {
      throw new ValidationError(
        "type must be a non-empty string when provided."
      );
    }

    if (!validTypes.includes(type as ResourceType)) {
      throw new ValidationError("type must be one of: ROOM, EQUIPMENT, LAB.");
    }

    filter.type = type as ResourceType;
  }

  if (isAvailable !== undefined) {
    filter.isAvailable = parseIsAvailable(isAvailable);
  }

  const resources = await Resource.find(filter);
  return resources.map(toDTO);
}
