import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Start one in-memory MongoDB for the whole test run: a one-node replica set, like Atlas,
// so transactions work. Set MONGODB_URI_TEST to use an external database instead.
export default async function globalSetup(): Promise<void> {
  if (process.env.MONGODB_URI_TEST) return;

  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  (globalThis as any).__MONGOD__ = mongod;
  process.env.MONGODB_URI_TEST = mongod.getUri();
}
