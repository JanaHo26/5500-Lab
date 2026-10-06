import { webcrypto } from "crypto";

// node 18 doesn't have the global crypto object that mongoose needs, so we add it here
if (typeof globalThis.crypto === "undefined") {
  (globalThis as { crypto?: typeof webcrypto }).crypto = webcrypto;
}

import express, { Express } from "express";
import dotenv from "dotenv";
import healthRoutes from "./routes/health.routes";
import resourceRoutes from "./routes/resource.routes";
import reservationRoutes from "./routes/reservation.routes";
import { errorHandler } from "./middleware/errorHandler";
import { connectDB } from "./config/db";

dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use("/api/v1", healthRoutes);
app.use("/api/v1", resourceRoutes);
app.use("/api/v1", reservationRoutes);

// Centralized error handler — must be registered last.
app.use(errorHandler);

async function startServer(): Promise<void> {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`CampusHub backend listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export default app;
