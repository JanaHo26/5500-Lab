import { Request, Response } from "express";
import { listResources } from "../services/resource.service";
import { Resource as ResourceDTO } from "../types/resource";
import { ErrorResponse } from "../types/common";

// GET /api/v1/resources
export async function getResources(
  req: Request,
  res: Response<ResourceDTO[] | ErrorResponse>
): Promise<void> {
  const type = req.query.type as string | undefined;
  const isAvailable = req.query.isAvailable as string | undefined;

  const result = await listResources(type, isAvailable);
  res.status(200).json(result);
}
