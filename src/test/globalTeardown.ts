import { MongoMemoryServer } from "mongodb-memory-server";

// stops the shared in-memory MongoDB after every test file has finished
export default async function globalTeardown(): Promise<void> {
  const mongoServer = (globalThis as { __MONGO_SERVER__?: MongoMemoryServer })
    .__MONGO_SERVER__;
  await mongoServer?.stop();
}
