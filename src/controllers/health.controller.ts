import { Request, Response } from "express";
import { getHealthStatus, HealthStatus } from "../services/health.service";

/**
 * Handles GET /api/v1/health.
 * Request/response + status code handling only — no DB access here.
 */
export function getHealth(_req: Request, res: Response<HealthStatus>): void {
  const health: HealthStatus = getHealthStatus();
  res.status(200).json(health);
}
