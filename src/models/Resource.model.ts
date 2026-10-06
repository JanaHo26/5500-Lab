import { Schema, model, Document } from "mongoose";

export type ResourceType = "ROOM" | "EQUIPMENT" | "LAB";

export interface IResource extends Document {
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}

const resourceSchema = new Schema<IResource>({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["ROOM", "EQUIPMENT", "LAB"],
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    required: true,
    default: true,
  },
});

export const Resource = model<IResource>("Resource", resourceSchema);
