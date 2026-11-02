/**
 * Staff writes that work offline. They return once the write is saved on the device; it is sent
 * to the API now or as soon as the connection returns (see `queue.ts`).
 */
import { useMemo, useSyncExternalStore } from 'react';
import { enqueueWrite, getQueueSnapshot, getServerQueueSnapshot, subscribeQueue, type QueuedWrite, type WriteKind } from './queue';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

/** Check-in, check-out or absence for one child, on the day it happens. */
export function recordAttendance(input: { childId: string; status: AttendanceStatus; checkIn?: Date; checkOut?: Date; notes?: string }) {
  const at = input.checkOut ?? input.checkIn ?? new Date();
  return enqueueWrite({
    kind: 'attendance',
    childId: input.childId,
    at,
    body: {
      date: at.toISOString(),
      status: input.status,
      ...(input.checkIn && { check_in: input.checkIn.toISOString() }),
      ...(input.checkOut && { check_out: input.checkOut.toISOString() }),
      ...(input.notes !== undefined && { notes: input.notes })
    }
  });
}

export interface DailyReportFields {
  meals?: { breakfast?: string; lunch?: string; snack?: string; dinner?: string };
  activities?: string[];
  nap_time?: { start?: string; end?: string; duration_minutes?: number };
  mood?: string;
  notes?: string;
  behavior_notes?: string;
  health_notes?: string;
}

/**
 * Saves today's report for one child. Send every section the screen holds, not only the one that
 * changed: the API replaces each section (e.g. all of `meals`) with what it receives.
 */
export function saveDailyReport(input: { childId: string; fields: DailyReportFields }) {
  const at = new Date();
  return enqueueWrite({ kind: 'daily-report', childId: input.childId, at, body: { ...input.fields, date: at.toISOString() } });
}

// --- React ---

/** The signed-in person's writes waiting to be sent, and whether a send is running. */
export function useSyncQueue() {
  return useSyncExternalStore(subscribeQueue, getQueueSnapshot, getServerQueueSnapshot);
}

/** Writes still waiting for one kind of record (optionally one child and day), for "por enviar" badges. */
export function usePendingWrites(kind: WriteKind, filter: { childId?: string; day?: string } = {}): QueuedWrite[] {
  const { writes } = useSyncQueue();
  const { childId, day } = filter;
  // Same array until the queue changes, so callers can memoise on it
  return useMemo(
    () =>
      writes.filter(
        (write) => write.kind === kind && !write.error && (!childId || write.childId === childId) && (!day || write.day === day)
      ),
    [writes, kind, childId, day]
  );
}
