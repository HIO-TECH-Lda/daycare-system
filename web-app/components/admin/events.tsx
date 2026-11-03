'use client';

import { useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useClasses } from '@/lib/api/admin';
import { useAllEvents, useDeleteEvent, useSaveEvent } from '@/lib/api/finance';
import { refId, type CalendarEvent } from '@/lib/api/types';
import { formatTime, formatWeekday } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const TYPES: Record<string, string> = { meeting: 'Reunião', activity: 'Actividade', holiday: 'Feriado / encerrado', reminder: 'Lembrete', other: 'Outro' };
const monthFormat = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric', timeZone: 'Africa/Maputo' });

/** The centre's calendar: upcoming events by month; create, edit, delete. Families see them in their app. */
export function AdminEvents() {
  const events = useAllEvents(maputoDay());
  const [editing, setEditing] = useState<CalendarEvent | 'new' | null>(null);

  if (events.isPending) return <ListSkeleton rows={4} />;
  if (!events.data) return <ErrorState error={events.error} onRetry={() => void events.refetch()} />;

  const months = new Map<string, CalendarEvent[]>();
  for (const event of events.data) {
    // "novembro de 2026" → "Novembro de 2026" (CSS capitalize would also capitalise "de")
    const month = monthFormat.format(new Date(event.start_date)).replace(/^./, (letter) => letter.toUpperCase());
    months.set(month, [...(months.get(month) ?? []), event]);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Eventos"
        actions={
          <Button size="touch" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            Novo evento
          </Button>
        }
      />
      {events.data.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sem eventos marcados" />
      ) : (
        [...months].map(([month, items]) => (
          <section key={month} className="grid gap-2">
            <h3 className="font-heading text-lg font-bold">{month}</h3>
            <ul className="grid gap-2">
              {items.map((event) => (
                <li key={event._id}>
                  <button type="button" onClick={() => setEditing(event)} className="grid w-full gap-0.5 rounded-xl border bg-card p-4 text-left hover:border-brand-green">
                    <span className="font-semibold">{event.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatWeekday(event.start_date)}
                      {event.is_all_day ? ' · todo o dia' : ` · ${formatTime(event.start_date)}${event.end_date ? `–${formatTime(event.end_date)}` : ''}`}
                      {' · '}
                      {typeof event.class_id === 'object' && event.class_id ? event.class_id.name : 'Todo o centro'}
                      {event.event_type ? ` · ${TYPES[event.event_type] ?? event.event_type}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <EventDialog key={editing === 'new' ? 'new' : (editing?._id ?? 'none')} target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/** Times are entered in Maputo time (UTC+2 all year). */
function toIso(day: string, time: string): string {
  return new Date(`${day}T${time || '00:00'}:00+02:00`).toISOString();
}

function EventDialog({ target, onClose }: { target: CalendarEvent | 'new' | null; onClose: () => void }) {
  const classes = useClasses();
  const save = useSaveEvent();
  const remove = useDeleteEvent();
  const existing = target && target !== 'new' ? target : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [day, setDay] = useState(existing ? maputoDay(new Date(existing.start_date)) : maputoDay());
  const [allDay, setAllDay] = useState(existing?.is_all_day ?? false);
  const [start, setStart] = useState(existing && !existing.is_all_day ? formatTime(existing.start_date) : '17:00');
  const [end, setEnd] = useState(existing?.end_date && !existing.is_all_day ? formatTime(existing.end_date) : '');
  const [type, setType] = useState(existing?.event_type ?? 'meeting');
  const [classId, setClassId] = useState(refId(existing?.class_id) ?? 'all');

  const submit = async () => {
    try {
      await save.mutateAsync({
        id: existing?._id,
        title: title.trim(),
        description: description.trim(),
        start: toIso(day, allDay ? '00:00' : start),
        end: !allDay && end ? toIso(day, end) : undefined,
        allDay,
        type,
        classId: classId === 'all' ? undefined : classId
      });
      toast.success(existing ? 'Evento actualizado.' : 'Evento criado. As famílias vêem-no na aplicação.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    }
  };

  const destroy = async () => {
    if (!existing) return;
    try {
      await remove.mutateAsync(existing._id);
      toast.success('Evento apagado.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível apagar.');
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar evento' : 'Novo evento'}</DialogTitle>
          <DialogDescription>Visível para as famílias (todo o centro, ou só uma turma) e para a equipa.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Título
            <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11" />
          </label>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Dia
              <Input type="date" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} className="h-11" />
            </label>
            <label className="flex h-11 items-center gap-2 text-sm">
              <Checkbox checked={allDay} onCheckedChange={(value) => setAllDay(value === true)} />
              Todo o dia
            </label>
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm font-medium">
                Início
                <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="h-11" />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Fim (opcional)
                <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="h-11" />
              </label>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm font-medium">
              Tipo
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Para
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o centro</SelectItem>
                  {(classes.data ?? []).map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Descrição (opcional)" aria-label="Descrição" />
        </div>
        <DialogFooter className="sm:justify-between">
          {existing ? (
            <Button variant="ghost" className="text-destructive" disabled={remove.isPending} onClick={() => void destroy()}>
              Apagar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!title.trim() || save.isPending} onClick={() => void submit()}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
