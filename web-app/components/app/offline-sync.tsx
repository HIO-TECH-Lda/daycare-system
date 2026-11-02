'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { flushQueue, getQueueSnapshot, onWriteSynced, setQueueUser } from '@/lib/offline/queue';

const RETRY_EVERY_MS = 30_000;

/**
 * Sends the offline queue for the signed-in person: on sign-in, when the connection returns,
 * when the app comes back to the foreground, and every 30 s while anything is waiting.
 * Renders nothing.
 */
export function OfflineSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  useEffect(() => {
    void setQueueUser(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const flush = () => {
      if (getQueueSnapshot().writes.some((write) => !write.error)) void flushQueue();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') flush();
    };
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(flush, RETRY_EVERY_MS);
    return () => {
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [userId]);

  // Refresh what the screens show once the API has the write
  useEffect(
    () =>
      onWriteSynced(({ write, conflict }) => {
        void queryClient.invalidateQueries({ queryKey: [write.kind] });
        if (conflict) {
          toast.info('Outro aparelho também alterou este registo. Ficou guardada a alteração mais recente.');
        }
      }),
    [queryClient]
  );

  return null;
}
