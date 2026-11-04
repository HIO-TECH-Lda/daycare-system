'use client';

import { useMemo, useState } from 'react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAllChildren, useClasses } from '@/lib/api/admin';
import {
  useAllInvoices,
  useAllPayments,
  useConfirmClaim,
  useCreateInvoice,
  useFinanceReport,
  useGenerateInvoices,
  usePendingClaims,
  useRecordPayment,
  useRejectClaim,
  useSetInvoiceStatus
} from '@/lib/api/finance';
import { personName, refId, type AdminPaymentClaim, type Invoice, type InvoiceStatus } from '@/lib/api/types';
import { formatDate, formatMT, formatPhone } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const STATUS: Record<InvoiceStatus, [string, string]> = {
  pending: ['Por pagar', 'bg-muted text-muted-foreground'],
  overdue: ['Em atraso', 'bg-berry-tint text-destructive'],
  paid: ['Paga', 'bg-green-tint text-green-text'],
  cancelled: ['Anulada', 'bg-muted text-muted-foreground line-through']
};
const CLAIM_METHODS: Record<string, string> = { mpesa: 'M-Pesa', emola: 'e-Mola', bank_transfer: 'Transferência', cash: 'Numerário' };
const PAYMENT_METHODS: { value: string; label: string; details?: string }[] = [
  { value: 'mobile_money', label: 'M-Pesa', details: 'M-Pesa' },
  { value: 'mobile_money:emola', label: 'e-Mola', details: 'e-Mola' },
  { value: 'bank_transfer', label: 'Transferência' },
  { value: 'cash', label: 'Numerário' }
];

function nameOf(ref: unknown): string {
  return ref && typeof ref === 'object' && 'name' in ref ? String((ref as { name: string }).name) : personName(ref as never);
}

function parseAmount(text: string): number {
  return Number(text.replace(/\s/g, '').replace(',', '.'));
}

type Tab = 'invoices' | 'claims' | 'payments';

/** Invoices, "Já paguei" notices to confirm, payments; the month's propina run and one-off invoices. */
export function AdminBilling() {
  const today = maputoDay();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [tab, setTab] = useState<Tab>('invoices');
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const invoices = useAllInvoices();
  const payments = useAllPayments();
  const claims = usePendingClaims();
  const month = useFinanceReport(monthStart, today);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Invoice | null>(null);

  const paidFor = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of payments.data ?? []) {
      const id = refId(payment.invoice_id);
      if (id) map.set(id, (map.get(id) ?? 0) + payment.amount);
    }
    return map;
  }, [payments.data]);

  if (invoices.isPending) return <ListSkeleton rows={6} />;
  if (!invoices.data) return <ErrorState error={invoices.error} onRetry={() => void invoices.refetch()} />;

  const term = search.trim().toLowerCase();
  const rows = invoices.data.filter(
    (invoice) =>
      (status === 'all' || invoice.status === status) &&
      (!term || [invoice.invoice_number, nameOf(invoice.child_id), personName(invoice.parent_id)].some((text) => text.toLowerCase().includes(term)))
  );
  const counts = (value: InvoiceStatus) => invoices.data.filter((invoice) => invoice.status === value).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Facturação"
        actions={
          <>
            <Button size="touch" variant="outline" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Nova factura
            </Button>
            <Button size="touch" onClick={() => setGenerating(true)}>
              Emitir propinas do mês
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Figure label={`Emitido em ${MONTHS[Number(today.slice(5, 7)) - 1]}`} value={month.data?.invoiced} />
        <Figure label={`Recebido em ${MONTHS[Number(today.slice(5, 7)) - 1]}`} value={month.data?.received} tone="green" />
        <Figure label="Em atraso (total)" value={month.data?.outstanding.overdue_amount} tone="berry" />
      </div>

      <div role="tablist" className="inline-flex rounded-full border bg-card p-1">
        {(
          [
            ['invoices', 'Facturas'],
            ['claims', `Por confirmar${claims.data?.length ? ` (${claims.data.length})` : ''}`],
            ['payments', 'Pagamentos']
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn('h-10 rounded-full px-4 text-sm font-medium', tab === value ? 'bg-green-tint text-green-text' : 'text-muted-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'pending', 'overdue', 'paid', 'cancelled'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className={cn('h-10 rounded-full border px-4 text-sm', status === value ? 'border-green-text bg-green-tint font-semibold text-green-text' : 'bg-card')}
              >
                {value === 'all' ? `Todas (${invoices.data.length})` : `${STATUS[value][0]} (${counts(value)})`}
              </button>
            ))}
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Procurar nº, criança ou encarregado" aria-label="Procurar" className="h-10 max-w-72 bg-card" />
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={Receipt} title="Nenhuma factura" />
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                    <th className="px-4 py-2.5 font-semibold">Nº</th>
                    <th className="px-2 py-2.5 font-semibold">Criança</th>
                    <th className="px-2 py-2.5 font-semibold">Encarregado</th>
                    <th className="px-2 py-2.5 font-semibold">Vence</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Total</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Em falta</th>
                    <th className="px-2 py-2.5 font-semibold">Estado</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((invoice) => {
                    const remaining = Math.max(0, invoice.amount - (paidFor.get(invoice._id) ?? 0));
                    const open = invoice.status === 'pending' || invoice.status === 'overdue';
                    return (
                      <tr key={invoice._id}>
                        <td className="px-4 py-2.5 tabular-nums">{invoice.invoice_number}</td>
                        <td className="px-2 py-2.5 font-medium">{nameOf(invoice.child_id)}</td>
                        <td className="px-2 py-2.5">{personName(invoice.parent_id)}</td>
                        <td className="px-2 py-2.5">{formatDate(invoice.due_date)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{formatMT(invoice.amount)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{open ? formatMT(remaining) : '—'}</td>
                        <td className="px-2 py-2.5">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', STATUS[invoice.status][1])}>{STATUS[invoice.status][0]}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {open && (
                            <Button size="sm" variant="ghost" className="text-teal-text" onClick={() => setPaying(invoice)}>
                              Registar pagamento
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'claims' && <ClaimsQueue claims={claims.data ?? []} loading={claims.isPending} />}

      {tab === 'payments' && (
        <ul className="divide-y rounded-2xl border bg-card">
          {(payments.data ?? []).map((payment) => (
            <li key={payment._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <strong className="font-semibold">{formatDate(payment.payment_date)}</strong> · {nameOf(payment.child_id)} ·{' '}
                {payment.payment_method_details || PAYMENT_METHODS.find((m) => m.value === payment.payment_method)?.label || payment.payment_method}
                {payment.reference_number ? ` · ${payment.reference_number}` : ''}
                {typeof payment.invoice_id === 'object' && payment.invoice_id ? ` · ${payment.invoice_id.invoice_number}` : ''}
              </span>
              <span className="font-semibold tabular-nums">{formatMT(payment.amount)}</span>
            </li>
          ))}
          {!payments.data?.length && <li className="px-4 py-6 text-sm text-muted-foreground">Ainda sem pagamentos.</li>}
        </ul>
      )}

      <GenerateDialog open={generating} onClose={() => setGenerating(false)} />
      <NewInvoiceDialog open={creating} onClose={() => setCreating(false)} />
      <PaymentDialog key={paying?._id ?? 'none'} invoice={paying} remaining={paying ? Math.max(0, paying.amount - (paidFor.get(paying._id) ?? 0)) : 0} onClose={() => setPaying(null)} />
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value?: number; tone?: 'green' | 'berry' }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums', tone === 'green' && 'text-green-text', tone === 'berry' && value ? 'text-destructive' : '')}>{value === undefined ? '…' : formatMT(value)}</p>
    </div>
  );
}

function ClaimsQueue({ claims, loading }: { claims: AdminPaymentClaim[]; loading: boolean }) {
  const confirm = useConfirmClaim();
  const reject = useRejectClaim();
  const [rejecting, setRejecting] = useState<AdminPaymentClaim | null>(null);
  const [reason, setReason] = useState('');

  if (loading) return <ListSkeleton rows={3} />;
  if (!claims.length) {
    return (
      <EmptyState icon={Receipt} title="Nenhum pagamento por confirmar">
        Quando um encarregado toca em &quot;Já paguei&quot;, o aviso aparece aqui com o código da transacção.
      </EmptyState>
    );
  }

  const doConfirm = async (claim: AdminPaymentClaim) => {
    try {
      await confirm.mutateAsync({ id: claim._id });
      toast.success('Pagamento confirmado e registado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível confirmar.');
    }
  };

  const doReject = async () => {
    if (!rejecting) return;
    try {
      await reject.mutateAsync({ id: rejecting._id, reason: reason.trim() });
      toast.success('Aviso recusado. O encarregado vê o motivo.');
      setRejecting(null);
      setReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível recusar.');
    }
  };

  return (
    <>
      <p className="text-sm text-muted-foreground">Confirme cada aviso com o extracto (M-Pesa, e-Mola ou banco) antes de o aceitar.</p>
      <ul className="grid gap-3">
        {claims.map((claim) => (
          <li key={claim._id} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">
                {formatMT(claim.amount)} · {CLAIM_METHODS[claim.method]}
                {claim.reference ? <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{claim.reference}</span> : null}
              </p>
              <p className="text-muted-foreground">
                {personName(claim.parent_id)}
                {typeof claim.parent_id === 'object' && claim.parent_id?.phone ? ` (${formatPhone(claim.parent_id.phone)})` : ''} · {nameOf(claim.child_id)} ·{' '}
                {typeof claim.invoice_id === 'object' && claim.invoice_id ? `${claim.invoice_id.invoice_number} (${formatMT(claim.invoice_id.amount)})` : ''} · pago a {formatDate(claim.paid_on)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-destructive text-destructive" onClick={() => setRejecting(claim)}>
                Recusar…
              </Button>
              <Button disabled={confirm.isPending} onClick={() => void doConfirm(claim)}>
                Confirmar
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={!!rejecting} onOpenChange={(value) => !value && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar o aviso de pagamento</DialogTitle>
            <DialogDescription>O encarregado vê o motivo e pode avisar de novo.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Ex.: não encontrámos o código no extracto M-Pesa." aria-label="Motivo" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={!reason.trim() || reject.isPending} onClick={() => void doReject()}>
              Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function nextMonth(): string {
  const [year, month] = maputoDay().split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** The month's propina for every child, with one amount per class (fixed or per class, as the centre decides). */
function GenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const classes = useClasses();
  const children = useAllChildren();
  const generate = useGenerateInvoices();
  const [period, setPeriod] = useState(nextMonth());
  const [due, setDue] = useState(`${nextMonth()}-10`);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [all, setAll] = useState('');
  const amountFor = (id: string) => amounts[id] ?? all;
  const rows = (classes.data ?? []).map((item) => ({ item, count: (children.data ?? []).filter((child) => refId(child.class_id) === item._id).length }));
  const chosen = rows.filter(({ item }) => parseAmount(amountFor(item._id)) > 0);
  const total = chosen.reduce((sum, { item, count }) => sum + count * parseAmount(amountFor(item._id)), 0);
  const [year, month] = period.split('-').map(Number);

  const submit = async () => {
    try {
      const result = await generate.mutateAsync({ period, dueDate: due, amounts: chosen.map(({ item }) => ({ class_id: item._id, amount: parseAmount(amountFor(item._id)) })) });
      toast.success(`${result.created} facturas emitidas${result.skipped ? ` (${result.skipped} já existiam)` : ''}. As famílias são avisadas.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível emitir.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir propinas do mês</DialogTitle>
          <DialogDescription>Uma factura por criança. As crianças que já têm a factura deste mês são saltadas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm font-medium">
              Mês
              <Input type="month" value={period} onChange={(event) => event.target.value && setPeriod(event.target.value)} className="h-11" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Vence a
              <Input type="date" value={due} onChange={(event) => event.target.value && setDue(event.target.value)} className="h-11" />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Valor para todas as turmas (MT)
            <Input inputMode="decimal" value={all} onChange={(event) => setAll(event.target.value)} placeholder="Ou indique por turma, abaixo" className="h-11" />
          </label>
          <div className="grid gap-2 rounded-xl border p-3">
            {rows.map(({ item, count }) => (
              <label key={item._id} className="grid grid-cols-[1fr_8rem] items-center gap-3 text-sm">
                <span>
                  {item.name} <span className="text-muted-foreground">({count} crianças)</span>
                </span>
                <Input inputMode="decimal" value={amountFor(item._id)} onChange={(event) => setAmounts({ ...amounts, [item._id]: event.target.value })} aria-label={`Valor ${item.name}`} className="h-10" />
              </label>
            ))}
          </div>
          <p className="text-sm">
            &quot;Propina {MONTHS[month - 1]} {year}&quot; · até {chosen.reduce((sum, row) => sum + row.count, 0)} facturas · {formatMT(total)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!chosen.length || generate.isPending} onClick={() => void submit()}>
            {generate.isPending ? 'A emitir…' : 'Emitir facturas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A one-off invoice (inscrição, uniforme, transporte…), with several lines. */
function NewInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const children = useAllChildren();
  const create = useCreateInvoice();
  const [childId, setChildId] = useState('');
  const [due, setDue] = useState(maputoDay());
  const [lines, setLines] = useState([{ description: '', quantity: '1', price: '' }]);
  const [notes, setNotes] = useState('');
  const child = children.data?.find((item) => item._id === childId);
  const items = lines.filter((line) => line.description.trim() && parseAmount(line.price) > 0).map((line) => ({ description: line.description.trim(), quantity: Number(line.quantity) || 1, unit_price: parseAmount(line.price) }));
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const close = () => {
    setChildId('');
    setLines([{ description: '', quantity: '1', price: '' }]);
    setNotes('');
    onClose();
  };

  const submit = async () => {
    if (!child) return;
    try {
      await create.mutateAsync({ childId: child._id, parentId: refId(child.parent_id)!, dueDate: due, items, notes });
      toast.success('Factura emitida. A família é avisada.');
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível emitir.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova factura</DialogTitle>
          <DialogDescription>Para inscrição, uniforme, transporte ou outros valores.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-[1fr_10rem] gap-2">
            <label className="grid gap-1 text-sm font-medium">
              Criança
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {(children.data ?? []).map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Vence a
              <Input type="date" value={due} onChange={(event) => event.target.value && setDue(event.target.value)} className="h-11" />
            </label>
          </div>
          {child && <p className="text-sm text-muted-foreground">Encarregado: {personName(child.parent_id)}</p>}
          <div className="grid gap-2">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_4rem_7rem_auto] gap-2">
                <Input value={line.description} onChange={(event) => setLines(lines.map((l, i) => (i === index ? { ...l, description: event.target.value } : l)))} placeholder="Descrição" aria-label="Descrição" className="h-10" />
                <Input inputMode="numeric" value={line.quantity} onChange={(event) => setLines(lines.map((l, i) => (i === index ? { ...l, quantity: event.target.value } : l)))} aria-label="Quantidade" className="h-10" />
                <Input inputMode="decimal" value={line.price} onChange={(event) => setLines(lines.map((l, i) => (i === index ? { ...l, price: event.target.value } : l)))} placeholder="Preço" aria-label="Preço" className="h-10" />
                <Button variant="ghost" size="icon-lg" aria-label="Retirar linha" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, i) => i !== index))}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            <Button variant="ghost" className="justify-start text-teal-text" onClick={() => setLines([...lines, { description: '', quantity: '1', price: '' }])}>
              <Plus aria-hidden />
              Outra linha
            </Button>
          </div>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Nota (opcional)" aria-label="Nota" />
          <p className="text-right font-semibold">Total: {formatMT(total)}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button disabled={!child || !items.length || create.isPending} onClick={() => void submit()}>
            Emitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ invoice, remaining, onClose }: { invoice: Invoice | null; remaining: number; onClose: () => void }) {
  const record = useRecordPayment();
  const setStatus = useSetInvoiceStatus();
  const [amount, setAmount] = useState(remaining ? String(remaining) : '');
  const [date, setDate] = useState(maputoDay());
  const [method, setMethod] = useState('mobile_money');
  const [reference, setReference] = useState('');
  const chosen = PAYMENT_METHODS.find((item) => item.value === method)!;

  const submit = async () => {
    if (!invoice) return;
    try {
      await record.mutateAsync({ invoice, amount: parseAmount(amount), date, method: method.split(':')[0], details: chosen.details ?? '', reference: reference.trim() });
      toast.success('Pagamento registado.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível registar.');
    }
  };

  const cancelInvoice = async () => {
    if (!invoice) return;
    try {
      await setStatus.mutateAsync({ id: invoice._id, status: 'cancelled' });
      toast.success('Factura anulada.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível anular.');
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registar pagamento</DialogTitle>
          <DialogDescription>
            {invoice ? `${invoice.invoice_number} · ${nameOf(invoice.child_id)} · em falta ${formatMT(remaining)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm font-medium">
              Valor (MT)
              <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-11" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Data
              <Input type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} className="h-11" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={method === item.value}
                onClick={() => setMethod(item.value)}
                className={cn('h-10 rounded-full border px-4 text-sm', method === item.value ? 'border-green-text bg-green-tint font-semibold text-green-text' : 'bg-background')}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Referência (opcional)
            <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Código da transacção" className="h-11" />
          </label>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" className="text-destructive" disabled={setStatus.isPending} onClick={() => void cancelInvoice()}>
            Anular factura
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!(parseAmount(amount) > 0) || record.isPending} onClick={() => void submit()}>
              Registar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
