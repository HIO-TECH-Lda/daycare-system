import { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function globalTeardown(): Promise<void> {
  const mongod = (globalThis as any).__MONGOD__ as MongoMemoryReplSet | undefined;
  if (mongod) await mongod.stop();
}
