'use client';

import { useState } from 'react';
import { Baby, Camera, CircleCheck, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAddPickupPerson, useAllChildren, useChildAttendance, useChildContacts, useClasses, useRemovePickupPerson, useUpdateChild } from '@/lib/api/admin';
import { daysBefore } from '@/lib/api/parent';
import { personName, refId, type Child } from '@/lib/api/types';
import { formatAge, formatDate, formatPhone, formatTime, initials } from '@/lib/format';
import { compressImage } from '@/lib/image';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { ChildAvatar, SafetyBadges } from '@/components/app/child-badges';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

/** Every child: search, filter by class, and the record (health, contacts, pickup people, attendance). */
export function Children() {
  const children = useAllChildren();
  const classes = useClasses();
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('all');
  const [open, setOpen] = useState<string | null>(null);

  if (children.isPending) return <ListSkeleton rows={6} />;
  if (!children.data) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;

  const term = search.trim().toLowerCase();
  const rows = children.data.filter((child) => (classId === 'all' || refId(child.class_id) === classId) && (!term || child.name.toLowerCase().includes(term) || personName(child.parent_id).toLowerCase().includes(term)));
  const child = children.data.find((item) => item._id === open) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader title="Crianças" description={`${children.data.length} inscritas`} />
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Procurar criança ou encarregado" aria-label="Procurar" className="h-11 bg-card pl-9" />
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="h-11 w-52 bg-card" aria-label="Turma">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {(classes.data ?? []).map((item) => (
              <SelectItem key={item._id} value={item._id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Baby} title="Nenhuma criança encontrada">
          As crianças entram aqui quando uma matrícula é aprovada.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => (
            <li key={item._id}>
              <button type="button" onClick={() => setOpen(item._id)} className="flex h-full w-full items-center gap-3 rounded-xl border bg-card p-3 text-left hover:border-brand-green">
                <ChildAvatar child={item} />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {typeof item.class_id === 'object' && item.class_id ? item.class_id.name : ''} · {formatAge(item.birth_date)}
                  </span>
                  <SafetyBadges child={item} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!child} onOpenChange={(value) => !value && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">{child && <ChildRecord key={child._id} child={child} />}</SheetContent>
      </Sheet>
    </div>
  );
}

type Tab = 'ficha' | 'contactos' | 'presencas';

function ChildRecord({ child }: { child: Child }) {
  const [tab, setTab] = useState<Tab>('ficha');
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <ChildAvatar child={child} className="size-14" />
          <div>
            <SheetTitle className="text-xl">{child.name}</SheetTitle>
            <SheetDescription>
              {formatAge(child.birth_date)} · {typeof child.class_id === 'object' && child.class_id ? child.class_id.name : ''}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="grid gap-4 px-4 pb-6">
        <div role="tablist" className="inline-flex w-fit rounded-full border p-1">
          {(
            [
              ['ficha', 'Ficha'],
              ['contactos', 'Contactos'],
              ['presencas', 'Presenças']
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn('h-9 rounded-full px-4 text-sm font-medium', tab === value ? 'bg-green-tint text-green-text' : 'text-muted-foreground')}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'ficha' && <ChildForm child={child} />}
        {tab === 'contactos' && <ChildContacts child={child} />}
        {tab === 'presencas' && <ChildAttendance child={child} />}
      </div>
    </>
  );
}

function ChildForm({ child }: { child: Child }) {
  const classes = useClasses();
  const update = useUpdateChild();
  const [name, setName] = useState(child.name);
  const [birth, setBirth] = useState(child.birth_date.slice(0, 10));
  const [classId, setClassId] = useState(refId(child.class_id) ?? '');
  const [allergies, setAllergies] = useState(child.allergies ?? '');
  const [medications, setMedications] = useState(child.medications ?? '');
  const [emergencyName, setEmergencyName] = useState(child.emergency_contact_name ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(child.emergency_contact_phone ?? '');
  const [photos, setPhotos] = useState(child.image_usage_authorized !== false);

  const save = async () => {
    try {
      await update.mutateAsync({
        id: child._id,
        changes: {
          name: name.trim(),
          birth_date: `${birth}T12:00:00+02:00`,
          class_id: classId,
          allergies: allergies.trim(),
          medications: medications.trim(),
          emergency_contact_name: emergencyName.trim(),
          emergency_contact_phone: emergencyPhone.trim(),
          image_usage_authorized: photos
        }
      });
      toast.success('Ficha guardada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    }
  };

  return (
    <form
      method="post"
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="grid gap-1 text-sm font-medium">
        Nome
        <Input value={name} onChange={(event) => setName(event.target.value)} className="h-11" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-medium">
          Nascimento
          <Input type="date" value={birth} onChange={(event) => setBirth(event.target.value)} className="h-11" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Turma
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(classes.data ?? []).map((item) => (
                <SelectItem key={item._id} value={item._id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Alergias
        <Textarea value={allergies} onChange={(event) => setAllergies(event.target.value)} rows={2} placeholder="Deixe vazio se nenhuma" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Medicação
        <Textarea value={medications} onChange={(event) => setMedications(event.target.value)} rows={2} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-medium">
          Contacto de emergência
          <Input value={emergencyName} onChange={(event) => setEmergencyName(event.target.value)} className="h-11" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Telemóvel
          <Input value={emergencyPhone} onChange={(event) => setEmergencyPhone(event.target.value)} inputMode="tel" className="h-11" />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox checked={photos} onCheckedChange={(value) => setPhotos(value === true)} className="mt-0.5" />
        A família autoriza fotografias da criança
      </label>
      <Button type="submit" size="touch" disabled={update.isPending || name.trim().length < 2}>
        Guardar ficha
      </Button>
    </form>
  );
}

function ChildContacts({ child }: { child: Child }) {
  const { guardians, pickup } = useChildContacts(child._id);
  const add = useAddPickupPerson();
  const remove = useRemovePickupPerson();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const today = maputoDay();

  const submit = async () => {
    try {
      await add.mutateAsync({ childId: child._id, name: name.trim(), relationship: relationship.trim(), phone: phone.trim(), photo: photo ? await compressImage(photo, 1200) : undefined });
      toast.success('Pessoa autorizada adicionada.');
      setName('');
      setRelationship('');
      setPhone('');
      setPhoto(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar.');
    }
  };

  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Encarregados</h3>
        {(guardians.data ?? []).map((guardian) => (
          <div key={guardian._id} className="text-sm">
            <p className="font-semibold">{guardian.name}</p>
            <p className="text-muted-foreground">{[guardian.relationship, guardian.phone && formatPhone(guardian.phone), guardian.email].filter(Boolean).join(' · ')}</p>
          </div>
        ))}
        {guardians.data?.length === 0 && <p className="text-sm text-muted-foreground">Conta: {personName(child.parent_id)}</p>}
      </section>

      <section className="grid gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pessoas autorizadas a recolher</h3>
        {(pickup.data ?? []).map((person) => (
          <div key={person._id} className="flex items-center gap-3">
            <Avatar className="size-12 rounded-xl">
              {person.photo_url && <AvatarImage src={person.photo_url} alt="" className="object-cover" />}
              <AvatarFallback className="rounded-xl bg-muted font-semibold">{initials(person.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">
                {person.name}
                {person.valid_on ? <span className="ml-2 text-xs font-medium text-sun-text">{person.valid_on.slice(0, 10) === today ? 'só hoje' : `só ${formatDate(person.valid_on)}`}</span> : null}
              </p>
              <p className="text-muted-foreground">{[person.relationship, person.phone && formatPhone(person.phone)].filter(Boolean).join(' · ')}</p>
            </div>
            {!person.valid_on && (
              <Button variant="ghost" size="icon-lg" className="text-destructive" aria-label={`Retirar ${person.name}`} onClick={() => remove.mutate(person._id)}>
                <X aria-hidden />
              </Button>
            )}
          </div>
        ))}
        <form
          method="post"
          className="grid gap-2 rounded-xl border bg-muted/40 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className="text-sm font-semibold">Adicionar pessoa autorizada</p>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" aria-label="Nome completo" className="h-11 bg-background" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="Relação" aria-label="Relação" className="h-11 bg-background" />
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Telemóvel" aria-label="Telemóvel" inputMode="tel" className="h-11 bg-background" />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-teal-text">
            {photo ? <CircleCheck className="size-4" aria-hidden /> : <Camera className="size-4" aria-hidden />}
            {photo ? photo.name : 'Fotografia (para a confirmação à saída)'}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
          </label>
          <Button type="submit" variant="outline" disabled={add.isPending || !name.trim() || !phone.trim()}>
            Adicionar
          </Button>
        </form>
      </section>
    </div>
  );
}

function ChildAttendance({ child }: { child: Child }) {
  const today = maputoDay();
  const from = daysBefore(today, 29);
  const attendance = useChildAttendance(child._id, from, today);
  if (attendance.isPending) return <ListSkeleton rows={3} />;
  const rows = [...(attendance.data ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const present = rows.filter((row) => row.status === 'present' || row.status === 'late').length;
  return (
    <div className="grid gap-3">
      <p className="text-sm">
        Últimos 30 dias: <strong>{present}</strong> {present === 1 ? 'dia' : 'dias'} na escola, {rows.length - present} ausências.
      </p>
      <ul className="divide-y rounded-xl border text-sm">
        {rows.map((row) => (
          <li key={row._id} className="flex justify-between gap-3 px-3 py-2">
            <span>{formatDate(`${row.date.slice(0, 10)}T12:00:00Z`)}</span>
            <span className="text-muted-foreground">
              {row.status === 'absent' || row.status === 'excused'
                ? row.notes || 'Ausente'
                : `${row.check_in ? formatTime(row.check_in) : '—'}${row.check_out ? ` – ${formatTime(row.check_out)}` : ''}`}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-2 text-muted-foreground">Sem registos.</li>}
      </ul>
    </div>
  );
}
