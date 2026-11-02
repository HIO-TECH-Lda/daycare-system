'use client';

import { useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ClipboardCheck, EllipsisVertical, Phone, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';
import { childrenOfClass, useDayAttendance, useMyChildren, useMyClasses, usePickupPeople, type DayAttendance } from '@/lib/api/staff';
import { api } from '@/lib/api/client';
import { personName, refId, type Attendance, type Child, type PickupPerson } from '@/lib/api/types';
import { formatPhone, formatTime, formatWeekday, initials } from '@/lib/format';
import { cancelWrite, flushQueue, maputoDay } from '@/lib/offline/queue';
import { recordAttendance, type AttendanceStatus } from '@/lib/offline/writes';
import { cn } from '@/lib/utils';
import { ClassPicker, useSelectedClass } from '@/components/app/class-picker';
import { ChildAvatar, PendingBadge, SafetyBadges } from '@/components/app/child-badges';
import { RollCallButton } from '@/components/staff/roll-call';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

type Stage = 'waiting' | 'present' | 'gone' | 'absent';

function stageOf(record: DayAttendance | undefined): Stage {
  if (!record?.status) return 'waiting';
  if (record.status === 'absent' || record.status === 'excused') return 'absent';
  return record.checkOut ? 'gone' : 'present';
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

type AttendanceInput = Parameters<typeof recordAttendance>[0];
/** Records attendance and offers "Desfazer" for a few seconds. */
type Save = (inputs: AttendanceInput[], done: string) => Promise<void>;

interface Undoable {
  writeId: string;
  childId: string;
  /** The child's record before the tap (none: the tap created it) */
  previous: DayAttendance | undefined;
}

/**
 * "Desfazer": a write still on the device is simply dropped. One the API already has is put back
 * as it was (or removed, when the tap created it); that part needs the internet.
 */
async function undo(items: Undoable[], day: string, queryClient: QueryClient) {
  const sent: Undoable[] = [];
  for (const item of items) if (!(await cancelWrite(item.writeId))) sent.push(item);
  try {
    if (sent.length) {
      // A write may be on its way: let it arrive (or fail) first
      await flushQueue();
      const remaining: Undoable[] = [];
      for (const item of sent) if (!(await cancelWrite(item.writeId))) remaining.push(item);
      if (remaining.length) {
        const records = (await api.get<Attendance[]>('/attendance', { date: day, limit: 100 })).data;
        for (const item of remaining) {
          const record = records.find((row) => refId(row.child_id) === item.childId);
          if (!record) continue;
          const before = item.previous;
          if (!before?.status) await api.delete(`/attendance/${record._id}`);
          else await api.put(`/attendance/${record._id}`, { status: before.status, check_in: before.checkIn ?? null, check_out: before.checkOut ?? null, notes: before.notes ?? '' });
        }
        await queryClient.invalidateQueries({ queryKey: ['attendance'] });
      }
    }
    toast.success('Desfeito.');
  } catch {
    toast.error('Não foi possível desfazer sem ligação ao servidor. Corrija na lista quando houver internet.');
  }
}

/**
 * Staff attendance for today: one tap to check a child in, check-out against the list of people
 * allowed to collect them, absences with a reason. Works offline (writes go through the queue).
 */
export function AttendanceBoard() {
  const now = new Date();
  const day = maputoDay(now);
  const classes = useMyClasses();
  const children = useMyChildren();
  const attendance = useDayAttendance(day);
  const pickup = usePickupPeople();
  const [classId, setClassId] = useSelectedClass(classes.data);
  const [checkingOut, setCheckingOut] = useState<Child | null>(null);
  const [markingAbsent, setMarkingAbsent] = useState<Child | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const queryClient = useQueryClient();

  if (classes.isPending || children.isPending) return <ListSkeleton rows={6} />;
  if (!children.data) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;
  if (!classes.data?.length) {
    return (
      <EmptyState icon={Users} title="Ainda não tem turmas">
        Peça à administração para o associar a uma turma. As crianças aparecem aqui depois disso.
      </EmptyState>
    );
  }

  const currentClass = classes.data.find((item) => item._id === classId);
  const rows = childrenOfClass(children.data, classId);
  const stages = new Map(rows.map((child) => [child._id, stageOf(attendance.byChild.get(child._id))]));
  const count = (stage: Stage) => rows.filter((child) => stages.get(child._id) === stage).length;
  const waiting = rows.filter((child) => stages.get(child._id) === 'waiting');

  const save: Save = async (inputs, done) => {
    const items: Undoable[] = [];
    try {
      for (const input of inputs) {
        const previous = attendance.byChild.get(input.childId);
        const write = await recordAttendance(input);
        items.push({ writeId: write.id, childId: input.childId, previous });
      }
      // One toast per child (or per bulk action): a newer action replaces the older toast, so an
      // out-of-date "Desfazer" can't wipe what came after it
      const id = inputs.length === 1 ? `attendance-${inputs[0].childId}` : 'attendance-bulk';
      toast.success(done, { id, duration: 6000, action: { label: 'Desfazer', onClick: () => void undo(items, day, queryClient) } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar. Tente novamente.');
    }
  };

  const checkIn = (child: Child) =>
    save([{ childId: child._id, status: 'present', checkIn: new Date(), notes: '' }], `Entrada de ${firstName(child.name)} registada.`);

  const checkInAll = async () => {
    setConfirmingAll(false);
    await save(
      waiting.map((child) => ({ childId: child._id, status: 'present', checkIn: new Date(), notes: '' })),
      waiting.length === 1 ? '1 entrada registada.' : `${waiting.length} entradas registadas.`
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Presenças"
        description={`${formatWeekday(now)} · ${currentClass?.name ?? ''}`}
        actions={
          <>
            <ClassPicker classes={classes.data} value={classId} onChange={setClassId} />
            <RollCallButton />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Presentes" value={count('present')} tone="green" />
        <Stat label="Por chegar" value={count('waiting')} />
        <Stat label="Foram para casa" value={count('gone')} />
        <Stat label="Ausentes" value={count('absent')} />
      </div>

      {waiting.length > 1 && (
        <Button variant="outline" size="touch" className="w-full border-dashed border-green-text text-green-text" onClick={() => setConfirmingAll(true)}>
          Marcar os {waiting.length} por chegar como presentes
        </Button>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Sem crianças nesta turma">
          Quando a administração inscrever crianças nesta turma, aparecem aqui.
        </EmptyState>
      ) : (
        <ul className="grid gap-2">
          {rows.map((child) => (
            <AttendanceRow
              key={child._id}
              child={child}
              record={attendance.byChild.get(child._id)}
              stage={stages.get(child._id) ?? 'waiting'}
              onCheckIn={() => void checkIn(child)}
              onCheckOut={() => setCheckingOut(child)}
              onAbsent={() => setMarkingAbsent(child)}
            />
          ))}
        </ul>
      )}

      <CheckoutSheet child={checkingOut} people={checkingOut ? (pickup.data?.get(checkingOut._id) ?? []) : []} save={save} onClose={() => setCheckingOut(null)} />
      <AbsenceDialog child={markingAbsent} save={save} onClose={() => setMarkingAbsent(null)} />

      <Dialog open={confirmingAll} onOpenChange={setConfirmingAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar {waiting.length} crianças como presentes?</DialogTitle>
            <DialogDescription>Confirme que estas crianças estão mesmo na sala.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-64 overflow-y-auto rounded-lg border text-sm">
            {waiting.map((child) => (
              <li key={child._id} className="border-b px-3 py-2 last:border-b-0">
                {child.name}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingAll(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void checkInAll()}>Marcar presentes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'green' }) {
  return (
    <div className={cn('rounded-xl border bg-card px-3 py-2.5 text-center', tone === 'green' && 'border-transparent bg-green-tint text-green-text')}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className={cn('text-xs', tone ? 'text-green-text' : 'text-muted-foreground')}>{label}</p>
    </div>
  );
}

function statusLine(stage: Stage, record: DayAttendance | undefined): string {
  if (!record || stage === 'waiting') return 'Ainda não chegou';
  if (stage === 'absent') return record.notes ? record.notes : 'Ausente';
  const arrived = record.checkIn ? `Entrou ${formatTime(record.checkIn)}` : 'Presente';
  if (stage === 'gone' && record.checkOut) return `${arrived} · saiu ${formatTime(record.checkOut)}${record.notes ? ` ${record.notes}` : ''}`;
  return arrived;
}

function AttendanceRow({
  child,
  record,
  stage,
  onCheckIn,
  onCheckOut,
  onAbsent
}: {
  child: Child;
  record: DayAttendance | undefined;
  stage: Stage;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onAbsent: () => void;
}) {
  return (
    <li className={cn('flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5', stage === 'absent' && 'opacity-80')}>
      <ChildAvatar child={child} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-semibold">{child.name}</p>
        <SafetyBadges child={child} />
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{statusLine(stage, record)}</span>
          {record?.pending && <PendingBadge />}
        </p>
      </div>
      {stage === 'waiting' && (
        <Button size="touch" className="bg-green-text hover:bg-green-text/90" onClick={onCheckIn}>
          Entrada
        </Button>
      )}
      {stage === 'present' && (
        <Button size="touch" variant="outline" className="border-teal-text text-teal-text" onClick={onCheckOut}>
          Saída
        </Button>
      )}
      {stage === 'gone' && <span className="rounded-full bg-green-tint px-2.5 py-1 text-xs font-semibold text-green-text">Foi para casa</span>}
      {stage === 'absent' && (
        <Button size="touch" variant="outline" onClick={onCheckIn}>
          Chegou
        </Button>
      )}
      {(stage === 'waiting' || stage === 'present') && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-lg" className="size-11" aria-label={`Mais opções para ${child.name}`}>
              <EllipsisVertical aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem className="h-11" onSelect={() => window.setTimeout(onAbsent, 0)}>
              Marcar ausente…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

interface Collector {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  photo?: string;
}

function collectorsFor(child: Child, people: PickupPerson[]): Collector[] {
  const guardian = typeof child.parent_id === 'object' && child.parent_id ? child.parent_id : null;
  return [
    ...(guardian ? [{ id: guardian._id, name: personName(guardian), relationship: 'Encarregado de Educação', phone: guardian.phone }] : []),
    ...people.map((person) => ({ id: person._id, name: person.name, relationship: person.relationship || 'Pessoa autorizada', phone: person.phone, photo: person.photo_url }))
  ];
}

/** Check-out: the educator picks who is collecting the child from the authorised list. */
function CheckoutSheet({ child, people, save, onClose }: { child: Child | null; people: PickupPerson[]; save: Save; onClose: () => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [notListed, setNotListed] = useState(false);
  const collectors = child ? collectorsFor(child, people) : [];
  const picked = collectors.find((person) => person.id === chosen);
  const guardianPhone = child && typeof child.parent_id === 'object' && child.parent_id?.phone ? child.parent_id.phone : child?.emergency_contact_phone;

  const close = () => {
    setChosen(null);
    setNotListed(false);
    onClose();
  };

  const confirm = async () => {
    if (!child || !picked) return;
    await save(
      [{ childId: child._id, status: 'present', checkOut: new Date(), notes: `com ${picked.name} (${picked.relationship})` }],
      `Saída de ${firstName(child.name)} registada.`
    );
    close();
  };

  return (
    <Sheet open={!!child} onOpenChange={(open) => !open && close()}>
      <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Quem vem buscar {child ? firstName(child.name) : ''}?</SheetTitle>
          <SheetDescription>Confirme a pessoa pela fotografia antes de entregar a criança.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-2 overflow-y-auto px-4">
          {collectors.map((person) => (
            <button
              key={person.id}
              type="button"
              aria-pressed={chosen === person.id}
              onClick={() => setChosen(person.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors',
                chosen === person.id ? 'border-teal-text bg-teal-tint' : 'hover:bg-muted'
              )}
            >
              <Avatar className="size-16 rounded-xl">
                {person.photo && <AvatarImage src={person.photo} alt="" className="object-cover" />}
                <AvatarFallback className="rounded-xl bg-muted text-base font-semibold">{initials(person.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{person.name}</span>
                <span className="block text-sm text-muted-foreground">{person.relationship}</span>
                {person.phone && <span className="block text-sm text-muted-foreground">{formatPhone(person.phone)}</span>}
              </span>
            </button>
          ))}
          {collectors.length === 0 && <p className="text-sm text-muted-foreground">Não há pessoas autorizadas registadas para esta criança.</p>}

          {notListed ? (
            <div role="alert" className="flex gap-3 rounded-xl bg-berry-tint p-3 text-sm text-destructive">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="space-y-2">
                <p className="font-semibold">Não entregue a criança a quem não está nesta lista.</p>
                <p>Ligue ao encarregado de educação para confirmar, e informe a direcção.</p>
                {guardianPhone && (
                  <Button asChild variant="outline" className="border-destructive text-destructive">
                    <a href={`tel:${guardianPhone}`}>
                      <Phone aria-hidden />
                      Ligar {formatPhone(guardianPhone)}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="justify-start text-destructive" onClick={() => setNotListed(true)}>
              A pessoa não está na lista
            </Button>
          )}
        </div>
        <SheetFooter>
          <Button size="touch" disabled={!picked} onClick={() => void confirm()}>
            {picked ? `Confirmar saída com ${picked.name}` : 'Escolha quem vem buscar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const ABSENCE_REASONS: { label: string; status: AttendanceStatus }[] = [
  { label: 'Doente', status: 'excused' },
  { label: 'Férias ou viagem', status: 'excused' },
  { label: 'Sem aviso', status: 'absent' }
];

/** Absence with a reason; a justified absence (illness, holidays) is recorded as "excused". */
function AbsenceDialog({ child, save, onClose }: { child: Child | null; save: Save; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const close = () => {
    setReason(null);
    setNote('');
    onClose();
  };

  const confirm = async () => {
    const chosen = ABSENCE_REASONS.find((item) => item.label === reason);
    if (!child || !chosen) return;
    const notes = `Ausente: ${chosen.label.toLowerCase()}${note.trim() ? ` (${note.trim()})` : ''}`;
    await save([{ childId: child._id, status: chosen.status, notes }], `Ausência de ${firstName(child.name)} registada.`);
    close();
  };

  return (
    <Dialog open={!!child} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{child?.name} está ausente</DialogTitle>
          <DialogDescription>Escolha o motivo. A família vê esta informação.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {ABSENCE_REASONS.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="outline"
              size="touch"
              aria-pressed={reason === item.label}
              className={cn('rounded-full', reason === item.label && 'border-green-text bg-green-tint text-green-text')}
              onClick={() => setReason(item.label)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota (opcional)" aria-label="Nota" rows={2} />
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button disabled={!reason} onClick={() => void confirm()}>
            Marcar ausente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
