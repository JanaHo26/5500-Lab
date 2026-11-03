import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { ErrorResponse } from "../types/common";

/**
 * Centralized Express error-handling middleware.
 * AppErrors keep their own status code; anything else becomes a 500 so no
 * raw stack traces leak.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }

  const message: string = err instanceof Error ? err.message : "Unknown error";
  // eslint-disable-next-line no-console
  console.error(message);
  res
    .status(500)
    .json({ code: "INTERNAL_ERROR", message: "Internal server error" });
}
