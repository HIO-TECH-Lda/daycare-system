'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAllChildren, useClasses, useDashboard } from '@/lib/api/admin';
import { useNotifications } from '@/lib/api/notifications';
import { refId } from '@/lib/api/types';
import { formatMT, formatTime, formatWeekday, greeting } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/page-states';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The administration's home (approved v1 improvement 14): what needs action, and the day's
 * figures. Each line of "Precisa de atenção" opens the list it counts.
 */
export function AdminDashboard() {
  const { user } = useAuth();
  const day = maputoDay();
  const data = useDashboard(day);
  const classes = useClasses();
  const children = useAllChildren();
  const failedNotices = useNotifications({ status: 'failed', page: 1 });

  const childCount = children.data?.length ?? 0;
  const capacity = (classes.data ?? []).reduce((sum, item) => sum + (item.capacity ?? 0), 0);
  const present = (data.attendance.data ?? []).filter((record) => record.status === 'present' || record.status === 'late').length;
  const toValidate = (data.monthly.data ?? []).filter((report) => report.status === 'submitted').length;
  const parentNotices = (data.attendance.data ?? []).filter((record) => record.notes?.startsWith('Aviso do encarregado'));
  const overdue = data.finance.data?.outstanding;

  const todo = [
    { count: data.enrollments.data?.length, label: 'Matrículas por analisar', href: '/admin/matriculas', tone: 'sun' },
    { count: data.claims.data, label: 'Pagamentos por confirmar', detail: 'Avisos "Já paguei" dos encarregados', href: '/admin/facturacao', tone: 'teal' },
    { count: overdue?.overdue_count, label: 'Facturas em atraso', detail: overdue ? `${formatMT(overdue.overdue_amount)} no total` : undefined, href: '/admin/facturacao', tone: 'berry' },
    { count: toValidate, label: 'Relatórios mensais por validar', href: '/admin/relatorios-mensais', tone: 'sun' },
    { count: failedNotices.data?.failedThisWeek, label: 'Avisos que falharam', detail: 'WhatsApp ou email, nos últimos 7 dias', href: '/admin/notificacoes', tone: 'berry' },
    { count: data.invited.data, label: 'Convites por aceitar', detail: 'Contas criadas que ainda não foram activadas', href: '/admin/pessoas?estado=invited', tone: 'muted' }
  ] as const;
  const pending = todo.filter((item) => (item.count ?? 0) > 0);
  const loading = data.enrollments.isPending || data.claims.isPending || data.finance.isPending;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`} description={formatWeekday(new Date())} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Presenças hoje" value={children.isPending ? undefined : `${present}`} detail={`de ${childCount}`} />
        <Kpi label="Ocupação" value={capacity ? `${Math.round((childCount / capacity) * 100)}%` : undefined} bar={capacity ? childCount / capacity : undefined} />
        <Kpi label="Recebido este mês" value={data.finance.data ? formatMT(data.finance.data.received) : undefined} tone="green" />
        <Kpi label="Em atraso" value={overdue ? formatMT(overdue.overdue_amount) : undefined} tone={overdue?.overdue_amount ? 'berry' : undefined} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_24rem]">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <h3 className="border-b px-4 py-3 font-semibold">Precisa de atenção</h3>
          {loading ? (
            <div className="grid gap-2 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : pending.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nada pendente. Tudo em dia.</p>
          ) : (
            <ul className="divide-y">
              {pending.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <span
                      className={cn(
                        'flex size-9 items-center justify-center rounded-lg font-bold tabular-nums',
                        item.tone === 'sun' && 'bg-sun-tint text-sun-text',
                        item.tone === 'teal' && 'bg-teal-tint text-teal-text',
                        item.tone === 'berry' && 'bg-berry-tint text-destructive',
                        item.tone === 'muted' && 'bg-muted text-foreground'
                      )}
                    >
                      {item.count}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{item.label}</span>
                      {'detail' in item && item.detail && <span className="block text-sm text-muted-foreground">{item.detail}</span>}
                    </span>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-5">
          <section className="overflow-hidden rounded-2xl border bg-card">
            <h3 className="border-b px-4 py-3 font-semibold">Hoje, por turma</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-2 font-semibold">Turma</th>
                  <th className="px-2 py-2 font-semibold">Presentes</th>
                  <th className="px-4 py-2 font-semibold">Relatórios</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(classes.data ?? []).map((item) => {
                  const ids = new Set((children.data ?? []).filter((child) => refId(child.class_id) === item._id).map((child) => child._id));
                  const here = (data.attendance.data ?? []).filter((r) => ids.has(refId(r.child_id) ?? '') && (r.status === 'present' || r.status === 'late')).length;
                  const filled = (data.reports.data ?? []).filter((r) => ids.has(refId(r.child_id) ?? '')).length;
                  return (
                    <tr key={item._id}>
                      <td className="px-4 py-2 font-medium">{item.name}</td>
                      <td className="px-2 py-2 tabular-nums">
                        {here} / {ids.size}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {filled} / {here}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {parentNotices.length > 0 && (
            <section className="grid gap-2 rounded-2xl border bg-card p-4">
              <h3 className="font-semibold">Ausências avisadas pelos pais</h3>
              {parentNotices.map((record) => (
                <p key={record._id} className="text-sm">
                  <strong className="font-semibold">{typeof record.child_id === 'object' && record.child_id ? record.child_id.name : ''}</strong>
                  {' · '}
                  {record.notes?.replace(/^Aviso do encarregado: /, '')}
                </p>
              ))}
            </section>
          )}

          {!!data.events.data?.length && (
            <section className="grid gap-2 rounded-2xl border bg-card p-4">
              <h3 className="font-semibold">Próximos eventos</h3>
              {data.events.data.slice(0, 3).map((event) => (
                <p key={event._id} className="text-sm">
                  <strong className="font-semibold">
                    {formatWeekday(event.start_date)}
                    {event.is_all_day ? '' : `, ${formatTime(event.start_date)}`}
                  </strong>
                  {' · '}
                  {event.title}
                </p>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, detail, bar, tone }: { label: string; value?: string; detail?: string; bar?: number; tone?: 'green' | 'berry' }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-1 h-8 w-24" />
      ) : (
        <p className={cn('text-2xl font-bold tabular-nums', tone === 'green' && 'text-green-text', tone === 'berry' && 'text-destructive')}>
          {value}
          {detail && <span className="ml-1 text-base font-medium text-muted-foreground">{detail}</span>}
        </p>
      )}
      {bar !== undefined && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <span className="block h-full bg-green-text" style={{ width: `${Math.min(100, bar * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
