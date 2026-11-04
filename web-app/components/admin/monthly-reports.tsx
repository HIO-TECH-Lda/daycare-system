'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useMonthlyReportsAll, useRejectMonthly, useValidateMonthly } from '@/lib/api/finance';
import { personName, type MonthlyReport } from '@/lib/api/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const SECTIONS = [
  ['achievements', 'Conquistas'],
  ['physical_development', 'Desenvolvimento físico'],
  ['cognitive_development', 'Desenvolvimento cognitivo'],
  ['social_development', 'Desenvolvimento social'],
  ['emotional_development', 'Desenvolvimento emocional'],
  ['areas_for_improvement', 'A melhorar'],
  ['recommendations', 'Recomendações'],
  ['general_notes', 'Notas']
] as const;

type Tab = 'submitted' | 'rejected' | 'validated';
const TABS: { value: Tab; label: string }[] = [
  { value: 'submitted', label: 'Por validar' },
  { value: 'rejected', label: 'Devolvidos' },
  { value: 'validated', label: 'Validados' }
];

function childName(report: MonthlyReport): string {
  return typeof report.child_id === 'object' && report.child_id ? report.child_id.name : '';
}

/** Monthly reports submitted by the educators: validate (the family receives it) or send back with a reason. */
export function AdminMonthlyReports() {
  const reports = useMonthlyReportsAll();
  const [tab, setTab] = useState<Tab>('submitted');
  const [openId, setOpenId] = useState<string | null>(null);

  if (reports.isPending) return <ListSkeleton rows={4} />;
  if (!reports.data) return <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />;

  const rows = reports.data.filter((report) => report.status === tab).sort((a, b) => b.year - a.year || b.month - a.month || childName(a).localeCompare(childName(b), 'pt'));
  const open = rows.find((report) => report._id === openId) ?? rows[0];
  const count = (status: Tab) => reports.data.filter((report) => report.status === status).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios mensais"
        actions={
          <div role="tablist" className="inline-flex rounded-full border bg-card p-1">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => {
                  setTab(item.value);
                  setOpenId(null);
                }}
                className={cn('h-10 rounded-full px-4 text-sm font-medium', tab === item.value ? 'bg-green-tint text-green-text' : 'text-muted-foreground')}
              >
                {item.label} ({count(item.value)})
              </button>
            ))}
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={FileText} title={tab === 'submitted' ? 'Nenhum relatório por validar' : 'Nada aqui'} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[20rem_1fr]">
          <ul className="grid gap-2">
            {rows.map((report) => (
              <li key={report._id}>
                <button
                  type="button"
                  onClick={() => setOpenId(report._id)}
                  className={cn('grid w-full gap-0.5 rounded-xl border bg-card p-3 text-left hover:border-brand-green', report._id === open?._id && 'border-teal-text bg-teal-tint')}
                >
                  <span className="font-semibold">{childName(report)}</span>
                  <span className="text-sm text-muted-foreground">
                    {MONTHS[report.month - 1]} {report.year} · por {personName(report.created_by)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {open && <ReportReview key={open._id} report={open} />}
        </div>
      )}
    </div>
  );
}

export function ReportBody({ report }: { report: MonthlyReport }) {
  const summary = report.attendance_summary;
  return (
    <div className="grid gap-4">
      {summary?.total_days ? (
        <p className="text-sm">
          Presenças: <strong>{summary.present_days ?? 0}</strong> de {summary.total_days} dias
          {summary.absent_days ? ` · ${summary.absent_days} ausências` : ''}
        </p>
      ) : null}
      {SECTIONS.filter(([key]) => report[key]).map(([key, title]) => (
        <section key={key} className="grid gap-1">
          <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
          <p className="text-sm leading-relaxed whitespace-pre-line">{report[key]}</p>
        </section>
      ))}
    </div>
  );
}

function ReportReview({ report }: { report: MonthlyReport }) {
  const validate = useValidateMonthly();
  const reject = useRejectMonthly();
  const [reason, setReason] = useState('');

  const doValidate = async () => {
    try {
      await validate.mutateAsync(report._id);
      toast.success('Relatório validado e enviado à família.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível validar.');
    }
  };

  const doReject = async () => {
    try {
      await reject.mutateAsync({ id: report._id, reason: reason.trim() });
      toast.success('Relatório devolvido ao educador, com o motivo.');
      setReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível devolver.');
    }
  };

  return (
    <section className="grid gap-5 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-2xl font-bold">
          {childName(report)} · {MONTHS[report.month - 1]}
        </h3>
        <span className="text-sm text-muted-foreground">
          por {personName(report.created_by)}
          {report.validated_at ? ` · validado a ${formatDate(report.validated_at)}` : ''}
        </span>
      </div>
      <ReportBody report={report} />
      {report.status === 'rejected' && report.rejection_reason && <p className="rounded-lg bg-berry-tint p-3 text-sm text-destructive">Devolvido: {report.rejection_reason}</p>}
      {report.status === 'submitted' && (
        <div className="grid gap-3 border-t pt-4">
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Motivo da devolução (obrigatório só para devolver)" aria-label="Motivo da devolução" />
          <div className="flex flex-wrap gap-2">
            <Button size="touch" disabled={validate.isPending} onClick={() => void doValidate()}>
              Validar e enviar à família
            </Button>
            <Button size="touch" variant="outline" className="border-destructive text-destructive" disabled={!reason.trim() || reject.isPending} onClick={() => void doReject()}>
              Devolver ao educador
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">A família só vê o relatório depois de validado.</p>
        </div>
      )}
    </section>
  );
}
