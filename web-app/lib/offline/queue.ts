/**
 * Offline queue for staff writes (attendance and daily reports).
 *
 * Every write is saved on the device first (IndexedDB) and then sent in order. Each one carries
 * its own `client_id`, so sending it twice (a retry after a dropped connection) can't create a
 * second record: the API returns the one already saved. The API keeps one record per child per
 * day; when another device changed it meanwhile, the newest write wins and the response says so.
 *
 * Writes belong to the person who made them: a shared tablet only sends the signed-in person's
 * writes, and keeps the others until that person signs in again.
 */
import { createStore, del, entries, set } from 'idb-keyval';
import { api, ApiRequestError } from '@/lib/api/client';

export type WriteKind = 'attendance' | 'daily-report';

const PATHS: Record<WriteKind, string> = {
  attendance: '/attendance',
  'daily-report': '/daily-reports'
};

export interface QueuedWrite {
  /** Also the `client_id` sent to the API */
  id: string;
  kind: WriteKind;
  userId: string;
  childId: string;
  /** The child's day (Maputo), for showing pending changes on the right day */
  day: string;
  body: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  /** Set when the API refused it (validation, permissions): it won't be retried on its own */
  error?: string;
}

export interface SyncedWrite {
  write: QueuedWrite;
  /** Another device changed the same record first; the API kept the newest values */
  conflict: boolean;
}

export interface QueueSnapshot {
  writes: QueuedWrite[];
  syncing: boolean;
  /** The last send couldn't reach the API (no internet, or the server is down) */
  unreachable: boolean;
}

// --- Storage (IndexedDB, or memory when it's unavailable, e.g. some private windows) ---

const store = typeof indexedDB === 'undefined' ? undefined : createStore('sdc-offline', 'writes');
const memory = new Map<string, QueuedWrite>();

async function saveWrite(write: QueuedWrite): Promise<void> {
  memory.set(write.id, write);
  try {
    if (store) await set(write.id, write, store);
  } catch {
    // Kept in memory for this session only
  }
}

async function removeWrite(id: string): Promise<void> {
  memory.delete(id);
  try {
    if (store) await del(id, store);
  } catch {
    // Already gone
  }
}

async function loadWrites(): Promise<QueuedWrite[]> {
  try {
    if (store) for (const [, write] of await entries<string, QueuedWrite>(store)) memory.set(write.id, write);
  } catch {
    // Use what's in memory
  }
  return [...memory.values()];
}

// --- State shared with React (useSyncExternalStore) ---

let currentUser: string | null = null;
let snapshot: QueueSnapshot = { writes: [], syncing: false, unreachable: false };
const listeners = new Set<() => void>();
const syncedListeners = new Set<(synced: SyncedWrite) => void>();

function publish(patch: Partial<QueueSnapshot> = {}): void {
  const writes = [...memory.values()]
    .filter((write) => write.userId === currentUser)
    .sort((a, b) => a.createdAt - b.createdAt);
  snapshot = { ...snapshot, ...patch, writes };
  listeners.forEach((listener) => listener());
}

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQueueSnapshot(): QueueSnapshot {
  return snapshot;
}

const EMPTY: QueueSnapshot = { writes: [], syncing: false, unreachable: false };
export function getServerQueueSnapshot(): QueueSnapshot {
  return EMPTY;
}

/** Called after each write the API accepted (refresh data, report conflicts). */
export function onWriteSynced(listener: (synced: SyncedWrite) => void): () => void {
  syncedListeners.add(listener);
  return () => syncedListeners.delete(listener);
}

// --- Public API ---

/** The calendar day in Maputo (YYYY-MM-DD), the same day the API files records under. */
export function maputoDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Switches the queue to the signed-in person (null when signed out) and sends what's waiting. */
export async function setQueueUser(userId: string | null): Promise<void> {
  currentUser = userId;
  await loadWrites();
  publish();
  if (userId) void flushQueue();
}

/** Saves a write on the device and tries to send it straight away. */
export async function enqueueWrite(input: { kind: WriteKind; childId: string; body: Record<string, unknown>; at?: Date }): Promise<QueuedWrite> {
  if (!currentUser) throw new Error('Sessão não iniciada');
  const at = input.at ?? new Date();
  const write: QueuedWrite = {
    id: crypto.randomUUID(),
    kind: input.kind,
    userId: currentUser,
    childId: input.childId,
    day: maputoDay(at),
    body: { ...input.body, child_id: input.childId },
    createdAt: at.getTime(),
    attempts: 0
  };
  await saveWrite(write);
  publish();
  void flushQueue();
  return write;
}

/** Sends a refused write again (after the cause was fixed, e.g. a permission restored). */
export async function retryWrite(id: string): Promise<void> {
  const write = memory.get(id);
  if (!write) return;
  await saveWrite({ ...write, error: undefined });
  publish();
  void flushQueue();
}

/** Drops a write that can't be sent. */
export async function discardWrite(id: string): Promise<void> {
  await removeWrite(id);
  publish();
}

/**
 * Takes back a write that hasn't reached the API yet ("Desfazer"). False when it was already
 * sent or is being sent: the caller then has to correct the record on the API.
 */
export async function cancelWrite(id: string): Promise<boolean> {
  if (id === sendingId || !memory.has(id)) return false;
  await removeWrite(id);
  publish();
  return true;
}

const SEND_TIMEOUT_MS = 20_000;

let flushing: Promise<void> | null = null;
// The write on its way to the API (it can no longer be cancelled)
let sendingId: string | null = null;
// A write saved while a flush was running: go round again once it ends
let flushAgain = false;

/**
 * Sends the signed-in person's waiting writes, oldest first. Stops at the first network or
 * server error (the order matters: a check-out must not arrive before its check-in) and tries
 * again later; a write the API refuses is set aside so it doesn't block the rest.
 */
export function flushQueue(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  // Cleared in .finally(), which always runs after this assignment (a flush with nothing to
  // send finishes synchronously, so clearing it inside would leave it set for good)
  flushing = sendWaiting().finally(() => {
    const again = flushAgain;
    flushing = null;
    flushAgain = false;
    publish({ syncing: false });
    // A write saved just as this flush was finishing
    if (again) void flushQueue();
  });
  return flushing;
}

async function sendWaiting(): Promise<void> {
  publish({ syncing: true });
  let blocked = false;
  do {
    flushAgain = false;
    for (const write of snapshot.writes) {
      if (write.error || write.userId !== currentUser) continue;
      try {
        sendingId = write.id;
        const res = await api.post<unknown>(
          PATHS[write.kind],
          { ...write.body, client_id: write.id },
          // A request that hangs (weak signal) would hold up the whole queue
          { signal: AbortSignal.timeout(SEND_TIMEOUT_MS) }
        );
        await removeWrite(write.id);
        sendingId = null;
        publish({ unreachable: false });
        const conflict = (res as { conflict?: boolean }).conflict === true;
        syncedListeners.forEach((listener) => listener({ write, conflict }));
      } catch (error) {
        sendingId = null;
        const status = error instanceof ApiRequestError ? error.status : 0;
        if (status === 0 || status === 401 || status === 408 || status === 429 || status >= 500) {
          await saveWrite({ ...write, attempts: write.attempts + 1 });
          publish({ unreachable: status === 0 });
          blocked = true;
          break;
        }
        await saveWrite({ ...write, attempts: write.attempts + 1, error: (error as Error).message });
        publish({ unreachable: false });
      }
    }
  } while (flushAgain && !blocked);
}
