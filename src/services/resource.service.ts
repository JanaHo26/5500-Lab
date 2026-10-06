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

export async function listResources(type?: string): Promise<ResourceDTO[]> {
  if (type === undefined) {
    const allResources = await Resource.find();
    return allResources.map(toDTO);
  }

  if (type.trim() === "") {
    throw new ValidationError("type must be a non-empty string when provided.");
  }

  if (!validTypes.includes(type as ResourceType)) {
    throw new ValidationError("type must be one of: ROOM, EQUIPMENT, LAB.");
  }

  const filter: QueryFilter<IResource> = { type: type as ResourceType };
  const filtered = await Resource.find(filter);
  return filtered.map(toDTO);
}
