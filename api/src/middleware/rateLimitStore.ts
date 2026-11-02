import mongoose from 'mongoose';
import type { IncrementResponse, Options, Store } from 'express-rate-limit';

interface HitDocument {
  _id: string;
  hits: number;
  resetAt: Date;
}

/**
 * express-rate-limit store backed by MongoDB, so every serverless instance shares the same
 * counters (the default memory store is per instance, and empties on every cold start).
 * Documents expire through a TTL index on `resetAt`.
 */
export class MongoRateLimitStore implements Store {
  private windowMs = 60_000;
  private indexReady?: Promise<unknown>;

  constructor(private readonly name: string, private readonly collectionName = 'ratelimits') {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private get collection() {
    return mongoose.connection.collection<HitDocument>(this.collectionName);
  }

  private id(key: string): string {
    return `${this.name}:${key}`;
  }

  private ensureIndex(): Promise<unknown> {
    this.indexReady ??= this.collection
      .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 })
      .catch((error) => console.error('[rate limit] TTL index creation failed:', error));
    return this.indexReady;
  }

  async increment(key: string): Promise<IncrementResponse> {
    await this.ensureIndex();
    const now = new Date();
    const windowOver = { $lte: [{ $ifNull: ['$resetAt', new Date(0)] }, now] };

    // One atomic upsert: start a new window when the previous one is over, otherwise count the hit
    const result: any = await this.collection.findOneAndUpdate(
      { _id: this.id(key) },
      [{
        $set: {
          hits: { $cond: [windowOver, 1, { $add: ['$hits', 1] }] },
          resetAt: { $cond: [windowOver, new Date(now.getTime() + this.windowMs), '$resetAt'] }
        }
      }] as any,
      { upsert: true, returnDocument: 'after' }
    );
    // MongoDB driver 5 wraps the document in { value }, driver 6 returns it directly
    const doc: HitDocument | null = result && 'value' in result ? result.value : result;

    return { totalHits: doc?.hits ?? 1, resetTime: doc?.resetAt };
  }

  async decrement(key: string): Promise<void> {
    await this.collection.updateOne({ _id: this.id(key), hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key: string): Promise<void> {
    await this.collection.deleteOne({ _id: this.id(key) });
  }
}
