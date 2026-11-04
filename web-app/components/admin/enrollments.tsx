'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useAllChildren, useApproveEnrollment, useClasses, useEnrollments, useMarkUnderReview, useRejectEnrollment, type ApprovalResult } from '@/lib/api/admin';
import { hasHealthNote, refId, type ClassInfo, type Enrollment, type EnrollmentStatus } from '@/lib/api/types';
import { daysAgo, formatAge, formatDate, formatPhone } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { InviteResult } from '@/components/admin/invite-result';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Tab = 'open' | 'approved' | 'rejected';
const TABS: { value: Tab; label: string }[] = [
  { value: 'open', label: 'Por analisar' },
  { value: 'approved', label: 'Aprovadas' },
  { value: 'rejected', label: 'Recusadas' }
];
const STATUS_LABEL: Record<EnrollmentStatus, string> = { submitted: 'Novo', under_review: 'Em análise', approved: 'Aprovada', rejected: 'Recusada' };

function ageInMonths(birth: string): number {
  const date = new Date(birth);
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
}

/** Enrolment requests: review side by side, assign a class, approve (invites the parent) or reject. */
export function Enrollments() {
  const pathname = usePathname();
  const params = useSearchParams();
  const openId = params.get('pedido');
  const [tab, setTab] = useState<Tab>('open');
  const all = useEnrollments();

  if (all.isPending) return <ListSkeleton rows={4} />;
  if (!all.data) return <ErrorState error={all.error} onRetry={() => void all.refetch()} />;

  const inTab = (item: Enrollment) => (tab === 'open' ? item.status === 'submitted' || item.status === 'under_review' : item.status === tab);
  const rows = all.data.filter(inTab).sort((a, b) => (tab === 'open' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  const open = all.data.find((item) => item._id === openId);
  const openCount = all.data.filter((item) => item.status === 'submitted' || item.status === 'under_review').length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className={cn(open && 'hidden lg:block')}>
        <PageHeader
          title="Matrículas"
          actions={
            <div role="tablist" className="inline-flex rounded-full border bg-card p-1">
              {TABS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.value}
                  onClick={() => setTab(item.value)}
                  className={cn('h-10 rounded-full px-4 text-sm font-medium', tab === item.value ? 'bg-green-tint text-green-text' : 'text-muted-foreground')}
                >
                  {item.label}
                  {item.value === 'open' && openCount > 0 ? ` (${openCount})` : ''}
                </button>
              ))}
            </div>
          }
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
        <ul className={cn('grid gap-2', open && 'hidden lg:grid')}>
          {rows.map((item) => {
            const { days, label } = daysAgo(item.createdAt);
            return (
              <li key={item._id}>
                <Link
                  href={`${pathname}?pedido=${item._id}`}
                  className={cn('grid gap-0.5 rounded-xl border bg-card p-3 hover:border-brand-green', item._id === openId && 'border-teal-text bg-teal-tint')}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{item.child.name}</span>
                    <span className={cn('shrink-0 text-xs', days >= 7 && tab === 'open' ? 'font-semibold text-sun-text' : 'text-muted-foreground')}>
                      {label}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatAge(item.child.birth_date)} · {item.guardians[0]?.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.reference} · {STATUS_LABEL[item.status]}
                  </span>
                </Link>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li>
              <EmptyState icon={Inbox} title={tab === 'open' ? 'Nenhum pedido por analisar' : 'Nada aqui ainda'}>
                {tab === 'open' ? 'Os pedidos feitos em /matricula aparecem aqui.' : undefined}
              </EmptyState>
            </li>
          )}
        </ul>

        <section className={cn(!open && 'hidden lg:block')}>
          {open ? (
            <EnrollmentDetail key={open._id} enrollment={open} back={pathname} />
          ) : (
            <div className="hidden min-h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground lg:flex">Escolha um pedido.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value, alert }: { label: string; value?: React.ReactNode; alert?: boolean }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn(alert && 'font-semibold text-destructive')}>{value}</dd>
    </div>
  );
}

function EnrollmentDetail({ enrollment, back }: { enrollment: Enrollment; back: string }) {
  const classes = useClasses();
  const children = useAllChildren();
  const approve = useApproveEnrollment();
  const markReview = useMarkUnderReview();
  const [rejecting, setRejecting] = useState(false);
  const [result, setResult] = useState<ApprovalResult | null>(null);
  const months = ageInMonths(enrollment.child.birth_date);
  const suggested =
    refId(enrollment.requested_class_id) ??
    classes.data?.find((item) => months >= (item.min_age_months ?? 0) && months <= (item.max_age_months ?? 999))?._id ??
    null;
  const [classId, setClassId] = useState<string | null>(null);
  const chosen = classId ?? suggested;
  const [startDate, setStartDate] = useState(maputoDay());
  const [override, setOverride] = useState(false);
  const occupancy = (item: ClassInfo) => (children.data ?? []).filter((child) => refId(child.class_id) === item._id).length;
  const chosenClass = classes.data?.find((item) => item._id === chosen);
  const full = !!chosenClass && occupancy(chosenClass) >= (chosenClass.capacity ?? Infinity);
  const decided = enrollment.status === 'approved' || enrollment.status === 'rejected';
  const main = enrollment.guardians[0];

  const submit = async () => {
    if (!chosen) return;
    try {
      const outcome = await approve.mutateAsync({ id: enrollment._id, classId: chosen, startDate, overrideCapacity: override });
      setResult(outcome);
      toast.success(`Matrícula de ${enrollment.child.name} aprovada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível aprovar.');
    }
  };

  return (
    <div className="grid gap-5 rounded-2xl border bg-card p-5">
      <Link href={back} className="inline-flex items-center gap-1 text-sm font-medium text-teal-text lg:hidden">
        <ChevronLeft className="size-4" aria-hidden />
        Pedidos
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-2xl font-bold">{enrollment.child.name}</h2>
        <span className="text-sm text-muted-foreground">
          {enrollment.reference} · recebido a {formatDate(enrollment.createdAt)} · {STATUS_LABEL[enrollment.status]}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Criança">
          <dl className="grid gap-1.5">
            <Row label="Nascimento" value={`${formatDate(enrollment.child.birth_date)} (${formatAge(enrollment.child.birth_date)})`} />
            <Row label="Sexo" value={enrollment.child.gender} />
            <Row label="Alergias" value={hasHealthNote(enrollment.child.allergies) ? enrollment.child.allergies : 'Nenhuma'} alert={hasHealthNote(enrollment.child.allergies)} />
            <Row label="Medicação" value={hasHealthNote(enrollment.child.medications) ? enrollment.child.medications : undefined} alert />
            <Row label="Alimentação" value={enrollment.child.dietary_restrictions} />
            <Row label="Línguas" value={enrollment.child.languages_spoken} />
            <Row label="Creche anterior" value={enrollment.child.previous_center} />
            <Row label="Início pedido" value={enrollment.requested_start_date ? formatDate(enrollment.requested_start_date) : undefined} />
          </dl>
        </Section>
        <Section title="Encarregados">
          <dl className="grid gap-1.5">
            {enrollment.guardians.map((guardian, index) => (
              <Row
                key={index}
                label={`${guardian.name}${index === 0 ? ' (principal)' : ''}`}
                value={[guardian.relationship, guardian.phone && formatPhone(guardian.phone), guardian.email].filter(Boolean).join(' · ')}
              />
            ))}
            <Row label="Autorizados" value={enrollment.pickup_persons?.map((person) => `${person.name}${person.relationship ? ` (${person.relationship})` : ''}`).join(', ')} />
            <Row
              label="Consentimentos"
              value={[
                'dados',
                enrollment.consents.image_usage_authorized ? 'fotografias' : 'sem fotografias',
                enrollment.consents.whatsapp_opt_in ? 'WhatsApp' : 'sem WhatsApp'
              ].join(' · ')}
            />
          </dl>
        </Section>
      </div>
      {enrollment.notes && <p className="rounded-lg bg-muted/60 p-3 text-sm">{enrollment.notes}</p>}
      {enrollment.status === 'rejected' && enrollment.rejection_reason && (
        <p className="rounded-lg bg-berry-tint p-3 text-sm text-destructive">Recusada: {enrollment.rejection_reason}</p>
      )}

      {result && main && <InviteResult name={main.name} link={result.inviteLink} delivery={result.delivery} />}

      {!decided && (
        <div className="grid gap-3 border-t pt-4">
          <h3 className="font-semibold">Aprovar</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              Turma
              <Select value={chosen ?? undefined} onValueChange={(value) => { setClassId(value); setOverride(false); }}>
                <SelectTrigger className="h-11 min-w-64 bg-background">
                  <SelectValue placeholder="Escolha a turma" />
                </SelectTrigger>
                <SelectContent>
                  {(classes.data ?? []).map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name} · {occupancy(item)}/{item.capacity ?? '—'}
                      {item._id === suggested ? ' (sugerida)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm">
              Início
              <Input type="date" value={startDate} onChange={(event) => event.target.value && setStartDate(event.target.value)} className="h-11 w-44" />
            </label>
          </div>
          {full && (
            <label className="flex items-start gap-3 rounded-lg bg-sun-tint p-3 text-sm text-sun-text">
              <Checkbox checked={override} onCheckedChange={(value) => setOverride(value === true)} className="mt-0.5" />
              A turma {chosenClass?.name} está cheia ({occupancy(chosenClass!)} de {chosenClass?.capacity}). Aprovar na mesma.
            </label>
          )}
          <p className="text-sm text-muted-foreground">
            Aprovar cria a ficha da criança, a conta do encarregado principal (com convite por WhatsApp ou email), os outros encarregados e as pessoas autorizadas.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="touch" disabled={!chosen || (full && !override) || approve.isPending} onClick={() => void submit()}>
              {approve.isPending ? 'A aprovar…' : 'Aprovar matrícula'}
            </Button>
            {enrollment.status === 'submitted' && (
              <Button size="touch" variant="outline" disabled={markReview.isPending} onClick={() => markReview.mutate(enrollment._id)}>
                Marcar em análise
              </Button>
            )}
            <Button size="touch" variant="outline" className="border-destructive text-destructive" onClick={() => setRejecting(true)}>
              Recusar…
            </Button>
          </div>
        </div>
      )}

      <RejectDialog enrollment={enrollment} open={rejecting} onClose={() => setRejecting(false)} />
    </div>
  );
}

function RejectDialog({ enrollment, open, onClose }: { enrollment: Enrollment; open: boolean; onClose: () => void }) {
  const reject = useRejectEnrollment();
  const [reason, setReason] = useState('');
  const submit = async () => {
    try {
      await reject.mutateAsync({ id: enrollment._id, reason: reason.trim() });
      toast.success('Pedido recusado. A família foi avisada.');
      setReason('');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível recusar.');
    }
  };
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recusar o pedido de {enrollment.child.name}</DialogTitle>
          <DialogDescription>O motivo segue para a família.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Ex.: sem vagas para a idade até Março." aria-label="Motivo" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={reason.trim().length < 3 || reject.isPending} onClick={() => void submit()}>
            Recusar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
