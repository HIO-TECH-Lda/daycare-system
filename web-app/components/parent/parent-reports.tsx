'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useChildReports, useMonthlyReports } from '@/lib/api/parent';
import { useMyChildren } from '@/lib/api/staff';
import { refId, type DailyReport, type MonthlyReport } from '@/lib/api/types';
import { formatTime, formatWeekday } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Reports for the parent: the last two weeks of daily reports, and the validated monthly ones. */
export function ParentReports() {
  const children = useMyChildren();
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [childId, setChildId] = useState<string | null>(null);

  if (children.isPending) return <ListSkeleton rows={4} />;
  if (!children.data) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;
  const child = children.data.find((item) => item._id === childId) ?? children.data[0];

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Relatórios" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" className="inline-flex rounded-full border bg-card p-1">
          {(['daily', 'monthly'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn('h-10 rounded-full px-4 text-sm font-medium', tab === value ? 'bg-green-tint text-green-text' : 'text-muted-foreground')}
            >
              {value === 'daily' ? 'Diários' : 'Mensais'}
            </button>
          ))}
        </div>
        {children.data.length > 1 && (
          <div className="flex gap-2">
            {children.data.map((item) => (
              <button
                key={item._id}
                type="button"
                aria-pressed={item._id === child?._id}
                onClick={() => setChildId(item._id)}
                className={cn('h-10 rounded-full border px-4 text-sm', item._id === child?._id ? 'border-green-text bg-green-tint font-semibold text-green-text' : 'bg-card')}
              >
                {item.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>
      {!child ? (
        <EmptyState icon={FileText} title="Ainda sem relatórios" />
      ) : tab === 'daily' ? (
        <DailyTimeline childId={child._id} />
      ) : (
        <MonthlyList childId={child._id} />
      )}
    </div>
  );
}

function DailyTimeline({ childId }: { childId: string }) {
  const reports = useChildReports(childId);
  if (reports.isPending) return <ListSkeleton rows={4} />;
  if (reports.error && !reports.data) return <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />;
  if (!reports.data?.length) {
    return (
      <EmptyState icon={FileText} title="Sem relatórios nas últimas duas semanas">
        Os relatórios aparecem aqui ao fim de cada dia.
      </EmptyState>
    );
  }
  return (
    <ol className="grid gap-3">
      {reports.data.map((report) => (
        <DayCard key={report._id} report={report} />
      ))}
    </ol>
  );
}

function DayCard({ report }: { report: DailyReport }) {
  const meals = [report.meals?.breakfast, report.meals?.snack, report.meals?.lunch].filter(Boolean);
  // Stored as midnight UTC of the centre day: noon keeps the weekday right in Maputo
  const day = `${report.date.slice(0, 10)}T12:00:00Z`;
  return (
    <li className="grid gap-2 rounded-2xl border bg-card p-4">
      <p className="font-semibold">{formatWeekday(day)}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {report.mood && <span>Disposição: {report.mood}</span>}
        {report.nap_time?.start && report.nap_time.end && (
          <span>
            Sesta: {formatTime(report.nap_time.start)} – {formatTime(report.nap_time.end)}
          </span>
        )}
        {meals.length > 0 && <span>Refeições: {meals.join(', ')}</span>}
      </div>
      {!!report.activities?.length && <p className="text-sm">{report.activities.join(' · ')}</p>}
      {report.notes && <p className="text-sm">&ldquo;{report.notes}&rdquo;</p>}
      {report.health_notes && <p className="rounded-lg bg-sun-tint p-2 text-sm text-sun-text">Saúde: {report.health_notes}</p>}
    </li>
  );
}

function MonthlyList({ childId }: { childId: string }) {
  const reports = useMonthlyReports();
  const [open, setOpen] = useState<MonthlyReport | null>(null);
  if (reports.isPending) return <ListSkeleton rows={3} />;
  if (reports.error && !reports.data) return <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />;
  const mine = (reports.data ?? []).filter((report) => refId(report.child_id) === childId);
  if (!mine.length) {
    return (
      <EmptyState icon={FileText} title="Ainda sem relatórios mensais">
        O relatório de cada mês aparece aqui depois de validado pela direcção.
      </EmptyState>
    );
  }
  return (
    <>
      <ul className="grid grid-cols-1 gap-2">
        {mine.map((report) => (
          <li key={report._id}>
            <button type="button" onClick={() => setOpen(report)} className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left hover:border-brand-green">
              <FileText className="size-5 text-green-text" aria-hidden />
              <span className="flex-1 font-semibold">
                {MONTHS[report.month - 1]} {report.year}
              </span>
              {report.attendance_summary?.total_days ? (
                <span className="text-sm text-muted-foreground">
                  {report.attendance_summary.present_days} de {report.attendance_summary.total_days} dias
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={!!open} onOpenChange={(value) => !value && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">
                  {MONTHS[open.month - 1]} {open.year}
                </SheetTitle>
                <SheetDescription>
                  {typeof open.child_id === 'object' && open.child_id ? open.child_id.name : ''}
                  {open.attendance_summary?.total_days ? ` · ${open.attendance_summary.present_days} de ${open.attendance_summary.total_days} dias na escola` : ''}
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4 pb-6">
                {(
                  [
                    ['Conquistas', open.achievements],
                    ['Desenvolvimento físico', open.physical_development],
                    ['Desenvolvimento cognitivo', open.cognitive_development],
                    ['Desenvolvimento social', open.social_development],
                    ['Desenvolvimento emocional', open.emotional_development],
                    ['A melhorar', open.areas_for_improvement],
                    ['Recomendações', open.recommendations],
                    ['Notas', open.general_notes]
                  ] as const
                )
                  .filter(([, text]) => text)
                  .map(([title, text]) => (
                    <section key={title} className="grid gap-1">
                      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
                      <p className="text-sm leading-relaxed">{text}</p>
                    </section>
                  ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
