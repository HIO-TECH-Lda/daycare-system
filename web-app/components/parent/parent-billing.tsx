'use client';

import { useState } from 'react';
import { CircleCheck, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { useClaimPayment, useInvoices, usePaymentClaims, usePayments } from '@/lib/api/parent';
import { refId, type ClaimMethod, type Invoice, type PaymentClaim } from '@/lib/api/types';
import { formatDate, formatMT } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const METHODS: { value: ClaimMethod; label: string }[] = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'emola', label: 'e-Mola' },
  { value: 'bank_transfer', label: 'Transferência' },
  { value: 'cash', label: 'Numerário' }
];

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Numerário',
  bank_transfer: 'Transferência',
  mobile_money: 'Carteira móvel',
  card: 'Cartão',
  check: 'Cheque',
  other: 'Outro'
};

// How to pay (account numbers, M-Pesa number): set per deployment, as the centre gives them
const INSTRUCTIONS = process.env.NEXT_PUBLIC_PAYMENT_INSTRUCTIONS;

function childName(invoice: Invoice): string {
  return typeof invoice.child_id === 'object' && invoice.child_id ? invoice.child_id.name : '';
}

/** Invoices with what's still owed, "Já paguei" to tell the centre about a payment, and the history. */
export function ParentBilling() {
  const invoices = useInvoices();
  const payments = usePayments();
  const claims = usePaymentClaims();
  const [paying, setPaying] = useState<{ invoice: Invoice; remaining: number } | null>(null);

  if (invoices.isPending) return <ListSkeleton rows={3} />;
  if (!invoices.data) return <ErrorState error={invoices.error} onRetry={() => void invoices.refetch()} />;

  const paidFor = (id: string) => (payments.data ?? []).filter((payment) => refId(payment.invoice_id) === id).reduce((sum, payment) => sum + payment.amount, 0);
  const claimFor = (id: string): PaymentClaim | undefined =>
    (claims.data ?? []).filter((claim) => refId(claim.invoice_id) === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const open = invoices.data.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue');
  const owed = open.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - paidFor(invoice._id)), 0);

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Facturação" />

      <section className={cn('rounded-2xl p-5', owed > 0 ? 'border bg-card' : 'bg-green-tint text-green-text')}>
        {owed > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">Em dívida</p>
            <p className="text-3xl font-bold tabular-nums">{formatMT(owed)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {INSTRUCTIONS ?? 'Pague por M-Pesa, e-Mola, transferência ou na secretaria, e depois toque em "Já paguei" na factura, com o código da transacção.'}
            </p>
          </>
        ) : (
          <p className="flex items-center gap-2 font-semibold">
            <CircleCheck className="size-5" aria-hidden />
            Tudo pago. Obrigado!
          </p>
        )}
      </section>

      {invoices.data.length === 0 ? (
        <EmptyState icon={Receipt} title="Ainda sem facturas" />
      ) : (
        <ul className="grid gap-3">
          {invoices.data.map((invoice) => {
            const paid = paidFor(invoice._id);
            const remaining = Math.max(0, invoice.amount - paid);
            const claim = claimFor(invoice._id);
            const unpaid = (invoice.status === 'pending' || invoice.status === 'overdue') && remaining > 0;
            return (
              <li key={invoice._id} className="grid gap-3 rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{invoice.items.map((item) => item.description).join(', ') || invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {childName(invoice)} · {invoice.invoice_number}
                    </p>
                  </div>
                  <StatusBadge invoice={invoice} />
                </div>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="text-sm">
                    <p className="text-lg font-bold tabular-nums">{formatMT(invoice.amount)}</p>
                    <p className="text-muted-foreground">
                      {invoice.status === 'paid' ? 'Paga' : `${invoice.due_date.slice(0, 10) < maputoDay() ? 'Venceu' : 'Vence'} a ${formatDate(invoice.due_date)}`}
                      {paid > 0 && unpaid ? ` · pago ${formatMT(paid)}, falta ${formatMT(remaining)}` : ''}
                    </p>
                  </div>
                  {unpaid && claim?.status !== 'pending' && (
                    <Button size="touch" onClick={() => setPaying({ invoice, remaining })}>
                      Já paguei
                    </Button>
                  )}
                </div>
                {unpaid && claim?.status === 'pending' && (
                  <p className="rounded-lg bg-teal-tint p-2.5 text-sm text-teal-text">
                    Avisou um pagamento de {formatMT(claim.amount)} a {formatDate(claim.paid_on)}. A administração vai confirmar.
                  </p>
                )}
                {unpaid && claim?.status === 'rejected' && (
                  <p className="rounded-lg bg-berry-tint p-2.5 text-sm text-destructive">
                    O pagamento avisado não foi confirmado{claim.rejection_reason ? `: ${claim.rejection_reason}` : ''}.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!!payments.data?.length && (
        <section className="grid gap-2">
          <h3 className="font-heading text-lg font-bold">Pagamentos recebidos</h3>
          <ul className="divide-y rounded-2xl border bg-card">
            {payments.data.map((payment) => (
              <li key={payment._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {formatDate(payment.payment_date)} · {payment.payment_method_details || PAYMENT_METHODS[payment.payment_method] || payment.payment_method}
                  {typeof payment.invoice_id === 'object' && payment.invoice_id ? ` · ${payment.invoice_id.invoice_number}` : ''}
                </span>
                <span className="font-semibold tabular-nums">{formatMT(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ClaimDialog target={paying} onClose={() => setPaying(null)} />
    </div>
  );
}

function StatusBadge({ invoice }: { invoice: Invoice }) {
  const overdue = invoice.status === 'overdue';
  const styles = {
    paid: ['Paga', 'bg-green-tint text-green-text'],
    pending: ['Por pagar', 'bg-muted text-muted-foreground'],
    overdue: ['Em atraso', 'bg-berry-tint text-destructive'],
    cancelled: ['Anulada', 'bg-muted text-muted-foreground line-through']
  } as const;
  const [label, className] = styles[invoice.status];
  return <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', className, overdue && 'font-bold')}>{label}</span>;
}

/** "Já paguei": how, how much, when, and the transaction code (not needed for cash). */
function ClaimDialog({ target, onClose }: { target: { invoice: Invoice; remaining: number } | null; onClose: () => void }) {
  const claim = useClaimPayment();
  const [method, setMethod] = useState<ClaimMethod>('mpesa');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(maputoDay());
  const value = Number((amount || String(target?.remaining ?? '')).replace(/\s/g, '').replace(',', '.'));
  const needsReference = method !== 'cash';

  const close = () => {
    setMethod('mpesa');
    setAmount('');
    setReference('');
    setPaidOn(maputoDay());
    onClose();
  };

  const submit = async () => {
    if (!target || !(value > 0) || (needsReference && !reference.trim())) return;
    try {
      await claim.mutateAsync({ invoiceId: target.invoice._id, amount: value, method, reference: reference.trim(), paidOn });
      toast.success('Obrigado! A administração vai confirmar o pagamento.');
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar.');
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Já paguei</DialogTitle>
          <DialogDescription>
            {target ? `${target.invoice.invoice_number} · falta ${formatMT(target.remaining)}. ` : ''}A administração confirma com o extracto e a factura fica paga.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {METHODS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={method === item.value}
                onClick={() => setMethod(item.value)}
                className={cn('h-11 rounded-full border px-4 text-sm', method === item.value ? 'border-green-text bg-green-tint font-semibold text-green-text' : 'bg-background')}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">
              Valor (MT)
              <Input inputMode="decimal" value={amount || String(target?.remaining ?? '')} onChange={(event) => setAmount(event.target.value)} className="h-11" />
            </label>
            <label className="grid gap-1 text-sm">
              Data
              <Input type="date" max={maputoDay()} value={paidOn} onChange={(event) => event.target.value && setPaidOn(event.target.value)} className="h-11" />
            </label>
          </div>
          {needsReference && (
            <label className="grid gap-1 text-sm">
              Código da transacção
              <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={method === 'bank_transfer' ? 'Referência da transferência' : 'Ex.: 8F2K3L9P'} className="h-11" />
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button disabled={claim.isPending || !(value > 0) || (needsReference && !reference.trim())} onClick={() => void submit()}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
