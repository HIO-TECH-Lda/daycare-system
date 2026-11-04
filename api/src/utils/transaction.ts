import mongoose, { ClientSession } from 'mongoose';

/** MongoDB answers this way when the server isn't a replica set (e.g. a plain local mongod). */
function transactionsUnsupported(error: unknown): boolean {
  const e = error as { code?: number; message?: string };
  return e?.code === 20 || /replica set member or mongos|Transaction numbers/i.test(e?.message ?? '');
}

/**
 * Runs `work` in a MongoDB transaction: all of its writes happen, or none do. Atlas supports this.
 * On a standalone local MongoDB (no transactions) it runs without one, with a warning: fine for
 * development, never the case in production.
 */
export async function withTransaction<T>(work: (session?: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (!transactionsUnsupported(error)) throw error;
    console.warn('[transaction] MongoDB has no transaction support (not a replica set); running without one.');
    return work(undefined);
  } finally {
    await session.endSession();
  }
}
