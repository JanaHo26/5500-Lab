import { QueryFilter, HydratedDocument } from "mongoose";
import { Resource, IResource, ResourceType } from "../models/Resource.model";
import { ResourceDTO } from "../types/resource";

const validTypes: ResourceType[] = ["ROOM", "EQUIPMENT", "LAB"];

export class ValidationError extends Error {
  code = "VALIDATION_ERROR";
}

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
