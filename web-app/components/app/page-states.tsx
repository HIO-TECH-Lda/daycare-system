'use client';

import type { LucideIcon } from 'lucide-react';
import { CloudOff, RotateCcw } from 'lucide-react';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** Title row of a screen: title, optional description, actions on the right. */
export function PageHeader({ title, description, actions, className }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0 space-y-1">
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Nothing to show yet, with what to do about it. */
export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-green-tint text-green-text">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="font-heading text-lg font-bold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** A query failed and there's nothing on the device to show instead. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const offline = error instanceof ApiRequestError && error.status === 0;
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-sun-tint text-sun-text">
        <CloudOff className="size-6" aria-hidden />
      </div>
      <p className="font-heading text-lg font-bold">{offline ? 'Sem ligação' : 'Não foi possível carregar'}</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {offline
          ? 'Esta informação ainda não está guardada neste aparelho. Abra esta página uma vez com internet para a poder usar sem ligação.'
          : error instanceof Error
            ? error.message
            : 'Ocorreu um erro. Tente novamente.'}
      </p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcw aria-hidden />
        Tentar de novo
      </Button>
    </div>
  );
}

/** Placeholder rows while a list loads. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-2" aria-busy="true" aria-label="A carregar">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}
