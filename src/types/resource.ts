export type ResourceType = "ROOM" | "EQUIPMENT" | "LAB";

// this is what we send back to the client for a resource
export interface ResourceDTO {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}
