export type ResourceType = "ROOM" | "EQUIPMENT" | "LAB";

// fields needed to create a resource; isAvailable defaults to true
export interface ResourceInput {
  name: string;
  type: ResourceType;
  location: string;
  isAvailable?: boolean;
}

// this is what we send back to the client for a resource
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}
