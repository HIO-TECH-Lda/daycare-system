'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useClasses } from '@/lib/api/admin';
import { useAttendanceReport, useExpensesReport, useFinanceReport, usePaymentsReport } from '@/lib/api/finance';
import { downloadCsv } from '@/lib/csv';
import { formatMT } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const METHODS: Record<string, string> = { cash: 'Numerário', bank_transfer: 'Transferência', mobile_money: 'Carteira móvel', card: 'Cartão', check: 'Cheque', other: 'Outro' };

function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${year}`;
}

function lastDay(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(year, m, 0)).getUTCDate()).padStart(2, '0')}`;
}

/** Finance, payments, expenses and attendance for a period, each exportable to CSV. */
export function Reports() {
  const thisMonth = maputoDay().slice(0, 7);
  const [fromMonth, setFromMonth] = useState(`${thisMonth.slice(0, 4)}-01`);
  const [toMonth, setToMonth] = useState(thisMonth);
  const from = `${fromMonth}-01`;
  const to = lastDay(toMonth);
  const finance = useFinanceReport(from, to);
  const payments = usePaymentsReport(from, to);
  const expenses = useExpensesReport(from, to);
  const period = `${monthLabel(fromMonth)} – ${monthLabel(toMonth)}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Relatórios"
        actions={
          <div className="flex items-center gap-2 text-sm">
            <Input type="month" value={fromMonth} max={toMonth} onChange={(event) => event.target.value && setFromMonth(event.target.value)} aria-label="De" className="h-11 w-40 bg-card" />
            a
            <Input type="month" value={toMonth} min={fromMonth} onChange={(event) => event.target.value && setToMonth(event.target.value)} aria-label="Até" className="h-11 w-40 bg-card" />
          </div>
        }
      />

      <Card
        title="Finanças"
        onExport={
          finance.data
            ? () =>
                downloadCsv(
                  `financas-${fromMonth}-${toMonth}.csv`,
                  ['Mês', 'Facturado', 'Recebido', 'Despesas'],
                  finance.data.by_month.map((row) => [monthLabel(row.month), row.invoiced, row.received, row.expenses])
                )
            : undefined
        }
      >
        {!finance.data ? (
          <Skeleton className="h-32" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Figure label="Facturado" value={formatMT(finance.data.invoiced)} />
              <Figure label="Recebido" value={formatMT(finance.data.received)} tone="green" />
              <Figure label="Despesas" value={formatMT(finance.data.expenses)} />
              <Figure label="Resultado" value={formatMT(finance.data.net)} tone={finance.data.net < 0 ? 'berry' : 'green'} />
            </div>
            <p className="text-sm text-muted-foreground">
              Em dívida hoje: {formatMT(finance.data.outstanding.amount)} em {finance.data.outstanding.count} facturas, das quais {formatMT(finance.data.outstanding.overdue_amount)} em atraso.
            </p>
            <Bars
              rows={finance.data.by_month.map((row) => ({ label: monthLabel(row.month), values: [row.received, row.expenses] }))}
              legend={['Recebido', 'Despesas']}
            />
          </>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title={`Pagamentos por forma · ${period}`}
          onExport={payments.data ? () => downloadCsv(`pagamentos-${fromMonth}-${toMonth}.csv`, ['Forma', 'Pagamentos', 'Valor'], payments.data.by_method.map((row) => [METHODS[row.method] ?? row.method, row.count, row.amount])) : undefined}
        >
          {!payments.data ? (
            <Skeleton className="h-24" />
          ) : (
            <Share rows={payments.data.by_method.map((row) => ({ label: `${METHODS[row.method] ?? row.method} (${row.count})`, value: row.amount }))} total={payments.data.total} />
          )}
        </Card>
        <Card
          title={`Despesas por categoria · ${period}`}
          onExport={expenses.data ? () => downloadCsv(`despesas-${fromMonth}-${toMonth}.csv`, ['Categoria', 'Despesas', 'Valor'], expenses.data.by_category.map((row) => [row.category, row.count, row.amount])) : undefined}
        >
          {!expenses.data ? (
            <Skeleton className="h-24" />
          ) : (
            <Share rows={expenses.data.by_category.map((row) => ({ label: `${row.category} (${row.count})`, value: row.amount }))} total={expenses.data.total} />
          )}
        </Card>
      </div>

      <AttendanceSection />
    </div>
  );
}

function AttendanceSection() {
  const classes = useClasses();
  const [month, setMonth] = useState(maputoDay().slice(0, 7));
  const [classId, setClassId] = useState('all');
  const report = useAttendanceReport(month, classId === 'all' ? undefined : classId);
  return (
    <Card
      title="Presenças"
      actions={
        <>
          <Input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} aria-label="Mês" className="h-10 w-40" />
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="h-10 w-44" aria-label="Turma">
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
        </>
      }
      onExport={
        report.data
          ? () =>
              downloadCsv(
                `presencas-${month}.csv`,
                ['Criança', 'Turma', 'Presente', 'Atrasado', 'Ausente', 'Justificado', 'Dias registados', 'Taxa (%)'],
                report.data.children.map((row) => [row.name, row.class, row.present, row.late, row.absent, row.excused, row.days, Math.round(row.rate * 100)])
              )
          : undefined
      }
    >
      {!report.data ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          <p className="text-sm">
            Taxa de presença: <strong>{Math.round(report.data.totals.rate * 100)}%</strong> · {report.data.totals.days} registos · {report.data.totals.absent + report.data.totals.excused} ausências
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2 font-semibold">Criança</th>
                  <th className="py-2 font-semibold">Turma</th>
                  <th className="py-2 text-right font-semibold">Presente</th>
                  <th className="py-2 text-right font-semibold">Ausente</th>
                  <th className="py-2 text-right font-semibold">Taxa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.data.children.map((row) => (
                  <tr key={row.child_id}>
                    <td className="py-2 font-medium">{row.name}</td>
                    <td className="py-2 text-muted-foreground">{row.class}</td>
                    <td className="py-2 text-right tabular-nums">{row.present + row.late}</td>
                    <td className="py-2 text-right tabular-nums">{row.absent + row.excused}</td>
                    <td className={cn('py-2 text-right tabular-nums', row.rate < 0.8 && 'font-semibold text-destructive')}>{Math.round(row.rate * 100)}%</td>
                  </tr>
                ))}
                {report.data.children.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted-foreground">
                      Sem registos neste mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function Card({ title, actions, onExport, children }: { title: string; actions?: React.ReactNode; onExport?: () => void; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg font-bold">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button variant="outline" size="sm" className="h-10" disabled={!onExport} onClick={onExport}>
            <Download aria-hidden />
            CSV
          </Button>
        </div>
      </div>
      {children}
    </section>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'berry' }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', tone === 'green' && 'text-green-text', tone === 'berry' && 'text-destructive')}>{value}</p>
    </div>
  );
}

/** Paired horizontal bars per month (received vs expenses). */
function Bars({ rows, legend }: { rows: { label: string; values: [number, number] }[]; legend: [string, string] }) {
  const max = Math.max(1, ...rows.flatMap((row) => row.values));
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sem movimentos no período.</p>;
  return (
    <div className="grid gap-2">
      <p className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-green-text" />
          {legend[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-sun" />
          {legend[1]}
        </span>
      </p>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[5rem_1fr] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <div className="grid gap-1">
            {row.values.map((value, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className={cn('block h-2.5 rounded-sm', index === 0 ? 'bg-green-text' : 'bg-brand-sun')} style={{ width: `${(value / max) * 100}%`, minWidth: value ? 2 : 0 }} />
                <span className="text-xs whitespace-nowrap tabular-nums">{formatMT(value)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Each row's share of the total, as a bar. */
function Share({ rows, total }: { rows: { label: string; value: number }[]; total: number }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sem movimentos no período.</p>;
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 text-sm">
          <div className="flex justify-between gap-2">
            <span>{row.label}</span>
            <span className="font-semibold tabular-nums">{formatMT(row.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full bg-teal-text" style={{ width: `${total ? (row.value / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
      <p className="text-right text-sm text-muted-foreground">Total: {formatMT(total)}</p>
    </div>
  );
}
