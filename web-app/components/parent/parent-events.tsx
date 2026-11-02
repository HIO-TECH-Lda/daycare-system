'use client';

import { CalendarDays } from 'lucide-react';
import { useUpcomingEvents } from '@/lib/api/parent';
import { formatTime, formatWeekday } from '@/lib/format';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';

const monthFormat = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric', timeZone: 'Africa/Maputo' });

/** The centre's and the children's classes' upcoming events, by month. */
export function ParentEvents() {
  const events = useUpcomingEvents();
  if (events.isPending) return <ListSkeleton rows={4} />;
  if (!events.data) return <ErrorState error={events.error} onRetry={() => void events.refetch()} />;

  const months = new Map<string, typeof events.data>();
  for (const event of events.data) {
    const month = monthFormat.format(new Date(event.start_date));
    months.set(month, [...(months.get(month) ?? []), event]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Eventos" />
      {events.data.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sem eventos marcados">
          Reuniões, festas e dias especiais aparecem aqui.
        </EmptyState>
      ) : (
        [...months].map(([month, items]) => (
          <section key={month} className="grid gap-2">
            <h3 className="font-heading text-lg font-bold capitalize">{month}</h3>
            <ul className="grid gap-2">
              {items.map((event) => (
                <li key={event._id} className="rounded-2xl border bg-card p-4">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatWeekday(event.start_date)}
                    {event.is_all_day ? ' · todo o dia' : ` · ${formatTime(event.start_date)}${event.end_date ? `–${formatTime(event.end_date)}` : ''}`}
                    {typeof event.class_id === 'object' && event.class_id ? ` · ${event.class_id.name}` : ''}
                  </p>
                  {event.description && <p className="mt-1 text-sm">{event.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
