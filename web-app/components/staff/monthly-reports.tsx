'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { childrenOfClass, useMyChildren, useMyClasses } from '@/lib/api/staff';
import { useAttendanceReport, useMonthlyReportsAll, useSaveMonthly, type MonthlyFields } from '@/lib/api/finance';
import { refId, type Child, type MonthlyReport } from '@/lib/api/types';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { MONTHS, ReportBody, SECTIONS } from '@/components/admin/monthly-reports';
import { ClassPicker, useSelectedClass } from '@/components/app/class-picker';
import { ChildAvatar } from '@/components/app/child-badges';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PAGE = '/staff/relatorios-mensais';
const STATUS: Record<MonthlyReport['status'] | 'none', [string, string]> = {
  none: ['Por escrever', 'bg-muted text-muted-foreground'],
  draft: ['Rascunho', 'bg-sun-tint text-sun-text'],
  submitted: ['Submetido', 'bg-teal-tint text-teal-text'],
  rejected: ['Devolvido', 'bg-berry-tint text-destructive'],
  validated: ['Validado', 'bg-green-tint text-green-text']
};

/** Last month until the 10th (reports are written early in the following month), then this month. */
function defaultMonth(): string {
  const today = maputoDay();
  if (Number(today.slice(8, 10)) > 10) return today.slice(0, 7);
  const [year, month] = today.split('-').map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** The educator's monthly reports: one per child per month, drafted then submitted to the direcção. */
export function StaffMonthlyReports() {
  const childId = useSearchParams().get('crianca');
  const [month, setMonth] = useState(defaultMonth());
  const [year, monthNumber] = month.split('-').map(Number);
  const classes = useMyClasses();
  const children = useMyChildren();
  const reports = useMonthlyReportsAll({ month: monthNumber, year });
  const [currentClassId, selectClass] = useSelectedClass(classes.data);

  if (classes.isPending || children.isPending || reports.isPending) return <ListSkeleton rows={5} />;
  if (!children.data) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;

  const reportFor = (id: string) => reports.data?.find((report) => refId(report.child_id) === id);
  const child = childId ? children.data.find((item) => item._id === childId) : undefined;
  if (child) {
    const classmates = childrenOfClass(children.data, refId(child.class_id));
    const index = classmates.findIndex((item) => item._id === child._id);
    return (
      <MonthlyEditor
        key={`${child._id}-${month}`}
        child={child}
        month={month}
        report={reportFor(child._id)}
        previous={classmates[index - 1]}
        next={classmates[index + 1]}
      />
    );
  }

  const rows = childrenOfClass(children.data, currentClassId);
  const done = rows.filter((item) => ['submitted', 'validated'].includes(reportFor(item._id)?.status ?? '')).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Relatórios mensais"
        description={`${MONTHS[monthNumber - 1]} ${year} · ${done} de ${rows.length} submetidos`}
        actions={
          <>
            <Input type="month" value={month} max={maputoDay().slice(0, 7)} onChange={(event) => event.target.value && setMonth(event.target.value)} aria-label="Mês" className="h-11 w-40 bg-card" />
            <ClassPicker classes={classes.data ?? []} value={currentClassId} onChange={selectClass} />
          </>
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={FileText} title="Sem crianças nesta turma" />
      ) : (
        <ul className="grid gap-2">
          {rows.map((item) => {
            const report = reportFor(item._id);
            const [label, className] = STATUS[report?.status ?? 'none'];
            return (
              <li key={item._id}>
                <Link href={`${PAGE}?crianca=${item._id}`} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:border-brand-green">
                  <ChildAvatar child={item} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', className)}>{label}</span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MonthlyEditor({ child, month, report, previous, next }: { child: Child; month: string; report?: MonthlyReport; previous?: Child; next?: Child }) {
  const [year, monthNumber] = month.split('-').map(Number);
  const attendance = useAttendanceReport(month, refId(child.class_id) ?? undefined);
  const save = useSaveMonthly();
  const [fields, setFields] = useState<MonthlyFields>(() => ({
    physical_development: report?.physical_development ?? '',
    cognitive_development: report?.cognitive_development ?? '',
    social_development: report?.social_development ?? '',
    emotional_development: report?.emotional_development ?? '',
    achievements: report?.achievements ?? '',
    areas_for_improvement: report?.areas_for_improvement ?? '',
    general_notes: report?.general_notes ?? '',
    recommendations: report?.recommendations ?? ''
  }));
  const locked = report?.status === 'validated' || report?.status === 'submitted';
  const row = attendance.data?.children.find((item) => item.child_id === child._id);
  const summary = row ? { total_days: row.days, present_days: row.present + row.late, absent_days: row.absent + row.excused, late_days: row.late } : report?.attendance_summary;

  const submit = async (status: 'draft' | 'submitted') => {
    try {
      await save.mutateAsync({ id: report?._id, childId: child._id, month: monthNumber, year, status, fields: { ...fields, attendance_summary: summary } });
      toast.success(status === 'submitted' ? 'Relatório submetido à direcção.' : 'Rascunho guardado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={PAGE} className="inline-flex items-center gap-1 text-sm font-medium text-teal-text">
        <ChevronLeft className="size-4" aria-hidden />
        Todas as crianças
      </Link>
      <div className="flex items-center gap-3">
        <ChildAvatar child={child} className="size-14" />
        <div>
          <h2 className="text-2xl font-bold">{child.name}</h2>
          <p className="text-sm text-muted-foreground">
            {MONTHS[monthNumber - 1]} {year}
            {summary?.total_days ? ` · ${summary.present_days} de ${summary.total_days} dias na escola` : ''}
          </p>
        </div>
      </div>

      {report?.status === 'rejected' && report.rejection_reason && (
        <p className="rounded-xl bg-berry-tint p-3 text-sm text-destructive">
          A direcção devolveu este relatório: <strong>{report.rejection_reason}</strong> Corrija e submeta de novo.
        </p>
      )}

      {locked && report ? (
        <section className="grid gap-4 rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {report.status === 'validated' ? 'Validado pela direcção e enviado à família.' : 'Submetido: aguarda a validação da direcção.'}
          </p>
          <ReportBody report={report} />
        </section>
      ) : (
        <section className="grid gap-4 rounded-2xl border bg-card p-5">
          {SECTIONS.map(([key, title]) => (
            <label key={key} className="grid gap-1 text-sm font-medium">
              {title}
              <Textarea value={fields[key] ?? ''} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} rows={key === 'achievements' || key === 'general_notes' ? 3 : 2} />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="touch" variant="outline" disabled={save.isPending} onClick={() => void submit('draft')}>
              Guardar rascunho
            </Button>
            <Button size="touch" disabled={save.isPending || !Object.values(fields).some((value) => typeof value === 'string' && value.trim())} onClick={() => void submit('submitted')}>
              Submeter à direcção
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">As presenças do mês são juntas automaticamente. A família só vê o relatório depois de validado.</p>
        </section>
      )}

      <nav aria-label="Crianças" className="flex gap-2">
        {previous && (
          <Button asChild variant="outline" size="touch" className="flex-1">
            <Link href={`${PAGE}?crianca=${previous._id}`}>
              <ChevronLeft aria-hidden />
              {previous.name.split(' ')[0]}
            </Link>
          </Button>
        )}
        {next && (
          <Button asChild variant="outline" size="touch" className="flex-1">
            <Link href={`${PAGE}?crianca=${next._id}`}>
              {next.name.split(' ')[0]}
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        )}
      </nav>
    </div>
  );
}
