import { Request, Response, NextFunction } from "express";
import { listResources, ValidationError } from "../services/resource.service";
import { ResourceDTO } from "../types/resource";
import { ErrorResponse } from "../types/common";

// GET /api/v1/resources
export function getResources(
  req: Request,
  res: Response<ResourceDTO[] | ErrorResponse>,
  next: NextFunction
): void {
  const type = req.query.type as string | undefined;

  listResources(type)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((error) => {
      if (error instanceof ValidationError) {
        res.status(400).json({ code: error.code, message: error.message });
        return;
      }
      next(error);
    });
}
