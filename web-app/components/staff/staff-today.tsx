'use client';

import Link from 'next/link';
import { ClipboardCheck, ClipboardList, School, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { childrenOfClass, useDayAttendance, useDayReports, useMyChildren, useMyClasses } from '@/lib/api/staff';
import { hasHealthNote } from '@/lib/api/types';
import { formatWeekday, greeting } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { useSelectedClass } from '@/components/app/class-picker';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { RollCallButton } from '@/components/staff/roll-call';


/** The educator's day at a glance: per class, who has arrived and which reports are missing. */
export function StaffToday() {
  const { user } = useAuth();
  const day = maputoDay();
  const classes = useMyClasses();
  const children = useMyChildren();
  const attendance = useDayAttendance(day);
  const reports = useDayReports(day);
  const [, selectClass] = useSelectedClass(classes.data);

  if (classes.isPending || children.isPending) return <ListSkeleton rows={3} />;
  if (!children.data) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}!`}
        description={formatWeekday(new Date())}
        actions={classes.data?.length ? <RollCallButton /> : undefined}
      />

      {!classes.data?.length ? (
        <EmptyState icon={School} title="Ainda não tem turmas">
          Peça à administração para o associar a uma turma.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.data.map((item) => {
            const rows = childrenOfClass(children.data, item._id);
            const arrived = rows.filter((child) => {
              const status = attendance.byChild.get(child._id)?.status;
              return status === 'present' || status === 'late';
            }).length;
            const absent = rows.filter((child) => {
              const status = attendance.byChild.get(child._id)?.status;
              return status === 'absent' || status === 'excused';
            }).length;
            const waiting = rows.length - arrived - absent;
            // Absent children need no report today
            const filled = rows.filter((child) => reports.byChild.has(child._id)).length;
            const expected = rows.length - absent;
            const flagged = rows.filter((child) => hasHealthNote(child.allergies) || hasHealthNote(child.medications));
            return (
              <section key={item._id} className="grid gap-4 rounded-2xl border bg-card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-heading text-xl font-bold">{item.name}</h3>
                  <span className="text-sm text-muted-foreground">{rows.length === 1 ? '1 criança' : `${rows.length} crianças`}</span>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <Figure label="chegaram" value={arrived} />
                  <Figure label="por chegar" value={waiting} />
                  <Figure label="relatórios" value={`${Math.min(filled, expected)}/${expected}`} />
                </dl>
                {flagged.length > 0 && (
                  <p className="flex items-start gap-2 text-sm text-destructive">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      Alergias ou medicação: {flagged.map((child) => child.name.split(' ')[0]).join(', ')}
                    </span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="touch" className="flex-1">
                    <Link href="/staff/presencas" onClick={() => selectClass(item._id)}>
                      <ClipboardCheck aria-hidden />
                      Presenças
                    </Link>
                  </Button>
                  <Button asChild size="touch" variant="outline" className="flex-1">
                    <Link href="/staff/relatorio-diario" onClick={() => selectClass(item._id)}>
                      <ClipboardList aria-hidden />
                      Relatórios
                    </Link>
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-2 py-2">
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}
