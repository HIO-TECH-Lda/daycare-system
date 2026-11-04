'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAssignStaff,
  useAssignments,
  useClasses,
  useCreateUser,
  usePasswordResetLink,
  useResendInvite,
  useSetUserStatus,
  useUnassignStaff,
  useUpdateUser,
  useUser,
  useUsers,
  type InviteResult as InviteOutcome
} from '@/lib/api/admin';
import { refId, type UserRow, type UserStatus } from '@/lib/api/types';
import { formatPhone } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { InviteResult } from '@/components/admin/invite-result';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Role = UserRow['role'];
const ROLE_TABS: { value: Role | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'responsavel', label: 'Encarregados' },
  { value: 'staff', label: 'Educadores' },
  { value: 'administrador', label: 'Administração' }
];
const STATUS: Record<UserStatus, [string, string]> = {
  active: ['Activa', 'bg-green-tint text-green-text'],
  invited: ['Convite enviado', 'bg-sun-tint text-sun-text'],
  inactive: ['Desactivada', 'bg-muted text-muted-foreground'],
  suspended: ['Suspensa', 'bg-berry-tint text-destructive']
};

function StatusPill({ status }: { status: UserStatus }) {
  const [label, className] = STATUS[status];
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', className)}>{label}</span>;
}

/** Parents, staff and administrators: accounts, invites, access. `?estado=invited` filters by status. */
export function People() {
  const initialStatus = useSearchParams().get('estado') as UserStatus | null;
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<UserStatus | 'all'>(initialStatus ?? 'all');
  const [search, setSearch] = useState('');
  const users = useUsers({ role: role || undefined, status, search: search.trim().length >= 2 ? search.trim() : undefined });
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pessoas"
        actions={
          <Button size="touch" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            Nova pessoa
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="inline-flex flex-wrap rounded-full border bg-card p-1">
          {ROLE_TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={role === item.value}
              onClick={() => setRole(item.value)}
              className={cn('h-10 rounded-full px-4 text-sm font-medium', role === item.value ? 'bg-green-tint text-green-text' : 'text-muted-foreground')}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as UserStatus | 'all')}>
          <SelectTrigger className="h-11 w-48 bg-card" aria-label="Estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {(Object.keys(STATUS) as UserStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS[value][0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Procurar nome, email ou telefone" aria-label="Procurar" className="h-11 bg-card pl-9" />
        </div>
      </div>

      {users.isPending ? (
        <ListSkeleton rows={6} />
      ) : !users.data ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : users.data.length === 0 ? (
        <EmptyState icon={Users} title="Ninguém encontrado" />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {users.data.map((user) => (
            <li key={user.id}>
              <button type="button" onClick={() => setOpen(user.id)} className="grid w-full gap-1 px-4 py-3 text-left hover:bg-muted/50 sm:grid-cols-[1.4fr_1fr_1.4fr_auto] sm:items-center sm:gap-4">
                <span className="font-semibold">{user.name}</span>
                <span className="text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                <span className="truncate text-sm text-muted-foreground">{[user.phone && formatPhone(user.phone), user.email].filter(Boolean).join(' · ')}</span>
                <StatusPill status={user.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <CreatePerson open={creating} onClose={() => setCreating(false)} />
      <PersonSheet id={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function CreatePerson({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('responsavel');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState(false);
  const [result, setResult] = useState<InviteOutcome | null>(null);

  const reset = () => {
    setFirstName('');
    setLastName('');
    setRole('responsavel');
    setPhone('');
    setEmail('');
    setWhatsapp(false);
    setResult(null);
  };

  const submit = async () => {
    try {
      setResult(await create.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim(), role, phone: phone.trim(), email: email.trim(), whatsappOptIn: whatsapp && !!phone.trim() }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a conta.');
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl">Nova pessoa</SheetTitle>
          <SheetDescription>Cria a conta e envia o convite por WhatsApp ou email.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4 pb-6">
          {result ? (
            <>
              <InviteResult name={result.user.name} link={result.inviteLink} delivery={result.delivery} />
              <Button size="touch" variant="outline" onClick={reset}>
                Criar outra pessoa
              </Button>
            </>
          ) : (
            <form
              method="post"
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <Labelled label="Nome">
                  <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11" />
                </Labelled>
                <Labelled label="Apelido">
                  <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11" />
                </Labelled>
              </div>
              <Labelled label="Perfil">
                <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['responsavel', 'staff', 'administrador'] as Role[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {ROLE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labelled>
              <Labelled label="Telemóvel">
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="84 123 4567" className="h-11" />
              </Labelled>
              <Labelled label="Email (opcional se tiver telemóvel)">
                <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-11" />
              </Labelled>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={whatsapp} disabled={!phone.trim()} onCheckedChange={(value) => setWhatsapp(value === true)} className="mt-0.5" />
                A pessoa aceita receber avisos por WhatsApp
              </label>
              <Button type="submit" size="touch" disabled={create.isPending || firstName.trim().length < 2 || lastName.trim().length < 2 || (!phone.trim() && !email.trim())}>
                {create.isPending ? 'A criar…' : 'Criar e enviar convite'}
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function PersonSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const user = useUser(id);
  return (
    <Sheet open={!!id} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {user.data ? (
          <PersonDetail key={user.data.id} user={user.data} />
        ) : (
          <SheetHeader>
            <SheetTitle>A carregar…</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PersonDetail({ user }: { user: NonNullable<ReturnType<typeof useUser>['data']> }) {
  const update = useUpdateUser();
  const setStatus = useSetUserStatus();
  const resend = useResendInvite();
  const resetLink = usePasswordResetLink();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ? formatPhone(user.phone) : '');
  const [email, setEmail] = useState(user.email);
  const [outcome, setOutcome] = useState<{ kind: 'invite' | 'reset'; result: InviteOutcome } | null>(null);

  const save = async () => {
    try {
      await update.mutateAsync({ id: user.id, changes: { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim() } });
      toast.success('Dados guardados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    }
  };

  const act = async (kind: 'invite' | 'reset') => {
    try {
      const result = kind === 'invite' ? await resend.mutateAsync(user.id) : await resetLink.mutateAsync(user.id);
      setOutcome({ kind, result });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar.');
    }
  };

  const toggleActive = async () => {
    const next: UserStatus = user.status === 'inactive' ? 'active' : 'inactive';
    try {
      await setStatus.mutateAsync({ id: user.id, status: next });
      toast.success(next === 'inactive' ? 'Conta desactivada: a pessoa já não consegue entrar.' : 'Conta reactivada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar o estado.');
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-xl">{user.name}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          {ROLE_LABELS[user.role]} <StatusPill status={user.status} />
        </SheetDescription>
      </SheetHeader>
      <div className="grid gap-5 px-4 pb-6">
        <form
          method="post"
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <Labelled label="Nome">
              <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11" />
            </Labelled>
            <Labelled label="Apelido">
              <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11" />
            </Labelled>
          </div>
          <Labelled label="Telemóvel">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" className="h-11" />
          </Labelled>
          <Labelled label="Email">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-11" />
          </Labelled>
          <p className="text-xs text-muted-foreground">WhatsApp: {user.whatsappOptIn ? 'aceite pela pessoa' : 'não aceite'} (só a própria pessoa pode mudar, no perfil).</p>
          <Button type="submit" variant="outline" disabled={update.isPending}>
            Guardar dados
          </Button>
        </form>

        {user.role === 'staff' && <StaffClasses staffId={user.id} />}

        <section className="grid gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Acesso</h3>
          {user.status === 'invited' && (
            <Button variant="outline" disabled={resend.isPending} onClick={() => void act('invite')}>
              Reenviar convite
            </Button>
          )}
          {user.status === 'active' && (
            <Button variant="outline" disabled={resetLink.isPending} onClick={() => void act('reset')}>
              Enviar link para nova palavra-passe
            </Button>
          )}
          {outcome && <InviteResult name={user.name} link={outcome.result.inviteLink ?? outcome.result.resetLink} delivery={outcome.result.delivery} kind={outcome.kind} />}
          <Button variant="outline" className={cn(user.status !== 'inactive' && 'border-destructive text-destructive')} disabled={setStatus.isPending} onClick={() => void toggleActive()}>
            {user.status === 'inactive' ? 'Reactivar conta' : 'Desactivar conta'}
          </Button>
        </section>
      </div>
    </>
  );
}

function StaffClasses({ staffId }: { staffId: string }) {
  const classes = useClasses();
  const assignments = useAssignments();
  const assign = useAssignStaff();
  const unassign = useUnassignStaff();
  const mine = (assignments.data ?? []).filter((row) => refId(row.staff_id) === staffId);
  const assigned = new Set(mine.map((row) => refId(row.class_id)));
  const available = (classes.data ?? []).filter((item) => !assigned.has(item._id));

  return (
    <section className="grid gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Turmas</h3>
      <div className="flex flex-wrap gap-2">
        {mine.map((row) => (
          <span key={row._id} className="inline-flex items-center gap-1 rounded-full bg-green-tint py-1 pr-1 pl-3 text-sm text-green-text">
            {typeof row.class_id === 'object' && row.class_id ? row.class_id.name : ''}
            <button type="button" aria-label="Retirar da turma" className="flex size-7 items-center justify-center rounded-full hover:bg-green-text/10" onClick={() => unassign.mutate(row._id)}>
              <X className="size-4" aria-hidden />
            </button>
          </span>
        ))}
        {mine.length === 0 && <p className="text-sm text-muted-foreground">Sem turmas: não vê nenhuma criança.</p>}
      </div>
      {available.length > 0 && (
        <Select value="" onValueChange={(classId) => assign.mutate({ staffId, classId })}>
          <SelectTrigger className="h-11" aria-label="Juntar a uma turma">
            <SelectValue placeholder="Juntar a uma turma…" />
          </SelectTrigger>
          <SelectContent>
            {available.map((item) => (
              <SelectItem key={item._id} value={item._id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </section>
  );
}
