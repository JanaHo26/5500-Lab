import mongoose from "mongoose";
import { randomUUID } from "crypto";
import os from "os";

// globalSetup.ts starts one in-memory MongoDB for the whole run. Each test
// file connects to its own randomly named database on it, so files running in
// parallel never see each other's data and tests never touch the real
// database from .env.
beforeAll(async () => {
  const uri = process.env.MONGO_TEST_URI;
  if (!uri) {
    throw new Error("MONGO_TEST_URI is not set; run tests with npm test");
  }
  await mongoose.connect(uri, {
    dbName: `test_${randomUUID()}`,
    // mongodb driver 7.6+ loads `os` with a dynamic import(), which silently
    // fails inside Jest's sandbox. The handshake then goes out without the
    // required "driver" info and MongoDB 8 rejects it. Handing the driver
    // `os` directly skips that import.
    runtimeAdapters: { os },
    // fail fast with the real reason instead of hanging until the hook times out
    serverSelectionTimeoutMS: 5000,
  });
});

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
