import { Model } from 'mongoose';
import { ApiError } from './ApiError';
import { startOfCentreDay } from './dates';

/**
 * Writes from the staff PWA may be replayed after being queued offline. For records that exist
 * once per child per day (attendance, daily report):
 * - the same `client_id` again → the record already saved is returned (`replayed`), nothing changes;
 * - a record for that child and day already exists (e.g. two tablets offline) → the newest write
 *   wins (`merged`) and the previous values are returned so the app can show what changed;
 * - otherwise the record is created (`created`).
 */
export type SyncOutcome = 'created' | 'replayed' | 'merged';

export interface SyncResult<T> {
  doc: T;
  outcome: SyncOutcome;
  /** The stored values before a merge */
  previous?: Record<string, unknown>;
}

export async function writeDayRecord<T>(
  model: Model<T>,
  childId: string,
  date: Date | string,
  fields: Record<string, unknown>,
  clientId?: string,
  retried = false
): Promise<SyncResult<T>> {
  const day = startOfCentreDay(date);

  if (clientId) {
    const replay = await model.findOne({ client_id: clientId });
    if (replay) {
      if (String((replay as any).child_id) !== String(childId)) {
        throw new ApiError(409, 'Este client_id já foi usado noutro registo');
      }
      return { doc: replay as T, outcome: 'replayed' };
    }
  }

  const existing = await model.findOne({ child_id: childId, date: day });
  if (existing) {
    const previous = (existing as any).toObject();
    (existing as any).set({ ...fields, ...(clientId && !previous.client_id ? { client_id: clientId } : {}) });
    await (existing as any).save();
    return { doc: existing as T, outcome: 'merged', previous };
  }

  try {
    const doc = await model.create({ ...fields, child_id: childId, date: day, ...(clientId && { client_id: clientId }) });
    return { doc: doc as T, outcome: 'created' };
  } catch (error) {
    // Another device created the same child/day at the same moment: merge into it instead
    if ((error as { code?: number }).code === 11000 && !retried) {
      return writeDayRecord(model, childId, date, fields, clientId, true);
    }
    throw error;
  }
}

/** True when the record changed since the version the client edited (`base_updated_at`). */
export function changedSince(record: { updatedAt?: Date } | null | undefined, base: unknown): boolean {
  if (!record?.updatedAt || !base) return false;
  return new Date(record.updatedAt).getTime() > new Date(base as string).getTime();
}
