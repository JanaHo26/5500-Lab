import { MongoMemoryServer } from "mongodb-memory-server";

// starts ONE in-memory MongoDB before any test file runs. Starting one per
// test file in parallel was slow enough on some laptops to time out.
export default async function globalSetup(): Promise<void> {
  const mongoServer = await MongoMemoryServer.create();
  (globalThis as { __MONGO_SERVER__?: MongoMemoryServer }).__MONGO_SERVER__ =
    mongoServer;
  process.env.MONGO_TEST_URI = mongoServer.getUri();
}
