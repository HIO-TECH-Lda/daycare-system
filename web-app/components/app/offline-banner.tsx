'use client';

import { useState } from 'react';
import { useOffline } from 'next/offline';
import { CloudOff, CloudUpload, TriangleAlert } from 'lucide-react';
import { discardWrite, flushQueue, retryWrite, type QueuedWrite } from '@/lib/offline/queue';
import { useSyncQueue } from '@/lib/offline/writes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const KIND_LABELS: Record<QueuedWrite['kind'], string> = {
  attendance: 'Presença',
  'daily-report': 'Relatório diário'
};

function records(count: number): string {
  return count === 1 ? '1 registo' : `${count} registos`;
}

/**
 * Connection and sync status for the signed-in area: no internet, writes waiting to be sent,
 * and writes the API refused (which need a decision).
 */
export function OfflineBanner() {
  const browserOffline = useOffline();
  const { writes, syncing, unreachable } = useSyncQueue();
  // The browser can say "online" while the API can't be reached (no data, server down)
  const offline = browserOffline || unreachable;
  const [reviewing, setReviewing] = useState(false);
  const waiting = writes.filter((write) => !write.error);
  const refused = writes.filter((write) => write.error);

  return (
    <>
      {offline ? (
        <div role="status" className="flex items-center gap-2 bg-sun-tint px-4 py-2 text-sm text-[#6b4a1e] sm:px-6 lg:px-10">
          <CloudOff className="size-4 shrink-0 text-sun-text" aria-hidden />
          <span className="flex-1">
            {browserOffline ? 'Sem internet.' : 'Sem ligação ao servidor.'}{' '}
            {waiting.length > 0
              ? `${records(waiting.length)} guardado${waiting.length === 1 ? '' : 's'} neste aparelho, enviado${waiting.length === 1 ? '' : 's'} quando a ligação voltar.`
              : 'O que registar fica guardado neste aparelho.'}
          </span>
          {/* The server may be back before the next automatic try (every 30 s) */}
          {!browserOffline && waiting.length > 0 && !syncing && (
            <Button size="sm" variant="ghost" className="h-8 text-[#6b4a1e]" onClick={() => void flushQueue()}>
              Tentar agora
            </Button>
          )}
        </div>
      ) : (
        waiting.length > 0 && (
          <div role="status" className="flex items-center gap-2 bg-teal-tint px-4 py-1.5 text-sm text-teal-text sm:px-6 lg:px-10">
            <CloudUpload className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{syncing ? `A enviar ${records(waiting.length)}…` : `${records(waiting.length)} por enviar.`}</span>
            {!syncing && (
              <Button size="sm" variant="ghost" className="h-8 text-teal-text" onClick={() => void flushQueue()}>
                Enviar agora
              </Button>
            )}
          </div>
        )
      )}

      {refused.length > 0 && (
        <div role="alert" className="flex items-center gap-2 bg-berry-tint px-4 py-1.5 text-sm text-destructive sm:px-6 lg:px-10">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">
            {refused.length === 1 ? '1 registo não foi aceite pelo servidor.' : `${refused.length} registos não foram aceites pelo servidor.`}
          </span>
          <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => setReviewing(true)}>
            Ver
          </Button>
        </div>
      )}

      <Dialog open={reviewing && refused.length > 0} onOpenChange={setReviewing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registos não aceites</DialogTitle>
            <DialogDescription>
              O servidor recusou estes registos. Tente de novo depois de resolver o motivo, ou descarte-os e registe outra vez.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid gap-3">
            {refused.map((write) => (
              <li key={write.id} className="grid gap-2 rounded-lg border p-3">
                <p className="text-sm">
                  <span className="font-medium">{KIND_LABELS[write.kind]}</span>
                  <span className="text-muted-foreground"> · {new Date(write.createdAt).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo', dateStyle: 'short', timeStyle: 'short' })}</span>
                </p>
                <p className="text-sm text-destructive">{write.error}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void retryWrite(write.id)}>
                    Tentar de novo
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void discardWrite(write.id)}>
                    Descartar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
