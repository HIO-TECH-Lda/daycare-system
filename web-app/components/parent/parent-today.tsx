'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Camera, CircleCheck, Clock, Home, MessageCircle, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { useConversations } from '@/lib/api/messages';
import { useAbsenceNotice, useAddPickupToday, useCancelPickupToday, useParentPickupPeople, useUpcomingEvents } from '@/lib/api/parent';
import { useDayAttendance, useDayReports, useMyChildren, useReportPhotos, type DayAttendance, type DayReport } from '@/lib/api/staff';
import { refId, type Child } from '@/lib/api/types';
import { formatDate, formatPhone, formatTime, formatWeekday, initials, greeting } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { compressImage } from '@/lib/image';
import { cn } from '@/lib/utils';
import { ChildAvatar } from '@/components/app/child-badges';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';


function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

/**
 * The parent's home: for each child, whether they're at the centre, today's report and photos,
 * plus "Avisar ausência" and "Quem vem buscar hoje" (one-day pickup authorisation).
 */
export function ParentToday() {
  const { user } = useAuth();
  const day = maputoDay();
  const children = useMyChildren();
  const attendance = useDayAttendance(day);
  const reports = useDayReports(day);
  const messages = useConversations();
  const events = useUpcomingEvents();
  const [selected, setSelected] = useState<string | null>(null);

  if (children.isPending) return <ListSkeleton rows={3} />;
  if (!children.data) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;

  const child = children.data.find((item) => item._id === selected) ?? children.data[0];
  const nextEvent = events.data?.[0];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`} description={formatWeekday(new Date())} />

      {!child ? (
        <EmptyState icon={Home} title="Ainda sem crianças associadas">
          Quando a matrícula for aprovada, o dia do seu filho aparece aqui.
        </EmptyState>
      ) : (
        <>
          {children.data.length > 1 && (
            <div role="tablist" aria-label="Crianças" className="flex flex-wrap gap-2">
              {children.data.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  role="tab"
                  aria-selected={item._id === child._id}
                  onClick={() => setSelected(item._id)}
                  className={cn(
                    'h-11 rounded-full border px-4 font-medium',
                    item._id === child._id ? 'border-green-text bg-green-tint text-green-text' : 'bg-card hover:bg-muted'
                  )}
                >
                  {firstName(item.name)}
                </button>
              ))}
            </div>
          )}

          <ChildDay key={child._id} child={child} record={attendance.byChild.get(child._id)} report={reports.byChild.get(child._id)} />

          {messages.unread > 0 && (
            <Link href="/responsavel/mensagens" className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-brand-green">
              <span className="flex size-10 items-center justify-center rounded-full bg-teal-text text-sm font-bold text-white">{messages.unread}</span>
              <span className="flex-1 font-semibold">{messages.unread === 1 ? 'Mensagem por ler' : 'Mensagens por ler'}</span>
              <MessageCircle className="size-5 text-teal-text" aria-hidden />
            </Link>
          )}

          {nextEvent && (
            <Link href="/responsavel/eventos" className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-brand-green">
              <span className="flex size-12 flex-col items-center justify-center rounded-xl bg-sun-tint text-sun-text">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{nextEvent.title}</span>
                <span className="block text-sm text-muted-foreground">
                  {formatWeekday(nextEvent.start_date)}
                  {nextEvent.is_all_day ? '' : ` · ${formatTime(nextEvent.start_date)}`}
                </span>
              </span>
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function ChildDay({ child, record, report }: { child: Child; record: DayAttendance | undefined; report: DayReport | undefined }) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const absent = record?.status === 'absent' || record?.status === 'excused';
  const arrived = !absent && !!record?.checkIn;

  return (
    <>
      <section
        className={cn(
          'flex items-center gap-3 rounded-2xl border p-4',
          arrived && !record?.checkOut ? 'border-transparent bg-green-tint text-green-text' : 'bg-card'
        )}
      >
        <ChildAvatar child={child} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {absent
              ? 'Ausente hoje'
              : record?.checkOut
                ? `Saiu às ${formatTime(record.checkOut)}`
                : arrived
                  ? `Na escola desde as ${formatTime(record!.checkIn!)}`
                  : 'Ainda não chegou'}
          </p>
          <p className="text-sm">
            {absent ? (record?.notes ?? '') : record?.checkOut && record.notes ? record.notes.replace(/^com /, 'Com ') : child.name}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="touch" disabled={arrived} onClick={() => setNoticeOpen(true)}>
          <Clock aria-hidden />
          Avisar ausência
        </Button>
        <Button variant="outline" size="touch" disabled={!!record?.checkOut || absent} onClick={() => setPickupOpen(true)}>
          <UserPlus aria-hidden />
          Quem vem buscar
        </Button>
      </div>

      <ReportCard child={child} report={report} />

      <AbsenceNoticeDialog child={child} open={noticeOpen} onClose={() => setNoticeOpen(false)} />
      <PickupTodaySheet child={child} open={pickupOpen} onClose={() => setPickupOpen(false)} />
    </>
  );
}

function ReportCard({ child, report }: { child: Child; report: DayReport | undefined }) {
  const photos = useReportPhotos(report?.id);
  const fields = report?.fields;
  const meals = [
    ['Pequeno-almoço', fields?.meals?.breakfast],
    ['Lanche', fields?.meals?.snack],
    ['Almoço', fields?.meals?.lunch]
  ].filter(([, value]) => value) as [string, string][];
  const nap = fields?.nap_time?.start && fields.nap_time.end ? `${formatTime(fields.nap_time.start)} – ${formatTime(fields.nap_time.end)}` : null;

  return (
    <section className="grid gap-3 rounded-2xl border bg-card p-4">
      <h3 className="font-heading text-lg font-bold">
        O dia {child.gender === 'Feminino' ? 'da' : child.gender === 'Masculino' ? 'do' : 'de'} {firstName(child.name)}
      </h3>
      {!fields ? (
        <p className="text-sm text-muted-foreground">A educadora ainda não preencheu o relatório de hoje.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {meals.map(([label, value]) => (
              <Item key={label} label={label} value={value} />
            ))}
            {nap && <Item label="Sesta" value={nap} />}
            {fields.mood && <Item label="Disposição" value={fields.mood} />}
          </dl>
          {!!fields.activities?.length && <p className="text-sm">{fields.activities.join(' · ')}</p>}
          {fields.notes && <p className="text-sm text-muted-foreground">&ldquo;{fields.notes}&rdquo;</p>}
          {fields.health_notes && <p className="rounded-lg bg-sun-tint p-2 text-sm text-sun-text">Saúde: {fields.health_notes}</p>}
          {!!photos.data?.length && (
            <div className="grid grid-cols-3 gap-2">
              {photos.data.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element -- signed API link, not a static asset
                <img key={photo._id} src={photo.photo_url} alt={photo.caption || `Fotografia de ${child.name}`} className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

const REASONS = ['Doente', 'Consulta médica', 'Assunto de família', 'Viagem'];

function tomorrow(): string {
  const date = new Date(`${maputoDay()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** "Avisar ausência": today, tomorrow or another day, with a reason the educators see. */
function AbsenceNoticeDialog({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const notice = useAbsenceNotice();
  const today = maputoDay();
  const [day, setDay] = useState(today);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const close = () => {
    setDay(today);
    setReason(null);
    setNote('');
    onClose();
  };

  const submit = async () => {
    if (!reason) return;
    try {
      await notice.mutateAsync({ childId: child._id, day, reason: note.trim() ? `${reason} (${note.trim()})` : reason });
      toast.success(`Ausência avisada para ${day === today ? 'hoje' : formatDate(`${day}T12:00:00Z`)}. A educadora já vê na lista.`);
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível avisar.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{firstName(child.name)} não vem</DialogTitle>
          <DialogDescription>A educadora vê o aviso logo na lista de presenças.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Choice on={day === today} onClick={() => setDay(today)}>
              Hoje
            </Choice>
            <Choice on={day === tomorrow()} onClick={() => setDay(tomorrow())}>
              Amanhã
            </Choice>
            <Input type="date" aria-label="Outro dia" min={today} value={day} onChange={(event) => event.target.value && setDay(event.target.value)} className="h-11 w-44" />
          </div>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((item) => (
              <Choice key={item} on={reason === item} onClick={() => setReason(item)}>
                {item}
              </Choice>
            ))}
          </div>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota para a educadora (opcional)" aria-label="Nota" rows={2} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button disabled={!reason || notice.isPending} onClick={() => void submit()}>
            Avisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn('h-11 rounded-full border px-4 text-sm', on ? 'border-green-text bg-green-tint font-semibold text-green-text' : 'bg-background hover:bg-muted')}
    >
      {children}
    </button>
  );
}

/**
 * Who may collect the child: the permanent list (managed by the administration) and anyone the
 * parent authorises for today only, with a photo so the educator can check at the door.
 */
function PickupTodaySheet({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const people = useParentPickupPeople();
  const add = useAddPickupToday();
  const cancel = useCancelPickupToday();
  const today = maputoDay();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const mine = (people.data ?? []).filter((person) => refId(person.child_id) === child._id && person.is_authorized);
  const permanent = mine.filter((person) => !person.valid_on);
  const forToday = mine.filter((person) => person.valid_on?.slice(0, 10) === today);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) return;
    try {
      await add.mutateAsync({ childId: child._id, name: name.trim(), relationship: relationship.trim(), phone: phone.trim(), photo: photo ? await compressImage(photo, 1200) : undefined });
      toast.success(`${name.trim()} pode buscar ${firstName(child.name)} hoje.`);
      setName('');
      setRelationship('');
      setPhone('');
      setPhoto(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Quem vem buscar {firstName(child.name)} hoje?</SheetTitle>
          <SheetDescription>A educadora só entrega a criança a quem estiver nesta lista, confirmando pela fotografia.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 overflow-y-auto px-4">
          <section className="grid gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sempre autorizados</h3>
            <p className="text-sm">Você{permanent.length ? `, ${permanent.map((p) => p.name).join(', ')}` : ''}.</p>
          </section>

          {forToday.length > 0 && (
            <section className="grid gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Só hoje</h3>
              {forToday.map((person) => (
                <div key={person._id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Avatar className="size-12 rounded-xl">
                    {person.photo_url && <AvatarImage src={person.photo_url} alt="" className="object-cover" />}
                    <AvatarFallback className="rounded-xl bg-muted font-semibold">{initials(person.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">{person.name}</p>
                    <p className="text-muted-foreground">{[person.relationship, person.phone && formatPhone(person.phone)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Button variant="ghost" size="icon-lg" className="size-11 text-destructive" aria-label={`Cancelar ${person.name}`} onClick={() => cancel.mutate(person._id)}>
                    <X aria-hidden />
                  </Button>
                </div>
              ))}
            </section>
          )}

          <form method="post"
            className="grid gap-2 rounded-xl border bg-muted/40 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <h3 className="font-semibold">Outra pessoa, só hoje</h3>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" aria-label="Nome completo" className="h-11 bg-background" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="Relação (ex.: tia)" aria-label="Relação" className="h-11 bg-background" />
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Telemóvel" aria-label="Telemóvel" inputMode="tel" className="h-11 bg-background" />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-teal-text">
              {photo ? <CircleCheck className="size-4" aria-hidden /> : <Camera className="size-4" aria-hidden />}
              {photo ? `Fotografia: ${photo.name}` : 'Juntar fotografia (recomendado)'}
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
            </label>
          </form>
        </div>
        <SheetFooter>
          <Button size="touch" disabled={!name.trim() || !phone.trim() || add.isPending} onClick={() => void submit()}>
            {add.isPending ? 'A guardar…' : 'Autorizar só hoje'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
