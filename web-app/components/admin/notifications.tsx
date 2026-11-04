'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronLeft, ChevronRight, Mail, MessageCircle, RotateCcw, Search, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import {
  useNotifications,
  useResendNotification,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationRow,
  type NotificationStatus
} from '@/lib/api/notifications';
import { formatDate, formatPhone, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS: Record<NotificationStatus, [string, string]> = {
  sent: ['Enviada', 'bg-muted text-muted-foreground'],
  delivered: ['Entregue', 'bg-teal-tint text-teal-text'],
  read: ['Lida', 'bg-green-tint text-green-text'],
  failed: ['Falhou', 'bg-berry-tint text-destructive'],
  skipped: ['Não enviada', 'bg-sun-tint text-sun-text']
};

const CATEGORIES: Record<NotificationCategory, string> = {
  account: 'Conta',
  enrollment: 'Matrícula',
  billing: 'Propinas',
  reports: 'Relatórios',
  attendance: 'Presenças',
  messages: 'Mensagens'
};

// WhatsApp ("sonho_invoice_new") and email ("invoice") template names, in words
const TEMPLATES: Record<string, string> = {
  invite: 'Convite',
  'password-reset': 'Nova palavra-passe',
  invoice: 'Nova factura',
  'invoice-new': 'Nova factura',
  'invoice-overdue': 'Factura em atraso',
  'invoice-paid': 'Pagamento confirmado',
  'daily-report': 'Relatório do dia',
  'monthly-report': 'Relatório mensal',
  'new-message': 'Nova mensagem',
  'attendance-checkin': 'Entrada',
  'attendance-checkout': 'Saída',
  'enrollment-received': 'Pedido de matrícula',
  'enrollment-approved': 'Matrícula aprovada'
};

function templateLabel(template: string): string {
  return TEMPLATES[template.replace(/^sonho_/, '').replace(/_/g, '-')] ?? template;
}

type Filter<T extends string> = T | 'all';

/** Every WhatsApp and email the centre sent: how it went, why it failed, and resends. */
export function Notifications() {
  const [status, setStatus] = useState<Filter<NotificationStatus>>('all');
  const [channel, setChannel] = useState<Filter<NotificationChannel>>('all');
  const [category, setCategory] = useState<Filter<NotificationCategory>>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const term = search.trim();
  const log = useNotifications({
    status: status === 'all' ? undefined : status,
    channel: channel === 'all' ? undefined : channel,
    category: category === 'all' ? undefined : category,
    search: term.length >= 2 ? term : undefined,
    page
  });
  // Any filter change goes back to the first page
  const filterBy = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Notificações" description="Avisos enviados por WhatsApp e email nos últimos 6 meses." />

      {log.data && (!log.data.whatsappConfigured || !log.data.emailConfigured) && (
        <p role="status" className="flex items-start gap-3 rounded-xl bg-sun-tint p-3 text-sm text-sun-text">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {!log.data.whatsappConfigured && !log.data.emailConfigured
              ? 'O WhatsApp e o email ainda não estão ligados: nenhum aviso sai do sistema.'
              : !log.data.whatsappConfigured
                ? 'O WhatsApp ainda não está ligado: os avisos vão só por email, e as entradas e saídas não são avisadas.'
                : 'O email ainda não está ligado: os avisos vão só por WhatsApp, a quem o aceitou.'}
          </span>
        </p>
      )}

      {log.data && log.data.failedThisWeek > 0 && status !== 'failed' && (
        <button
          type="button"
          onClick={() => filterBy(setStatus)('failed')}
          className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-berry-tint p-3 text-left text-sm text-destructive"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">
            <strong>{log.data.failedThisWeek === 1 ? '1 aviso falhou' : `${log.data.failedThisWeek} avisos falharam`}</strong> nos últimos 7 dias.
          </span>
          <span className="font-semibold underline-offset-2 hover:underline">Ver</span>
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(value) => filterBy(setStatus)(value as Filter<NotificationStatus>)}>
          <SelectTrigger className="h-11 w-40 bg-card" aria-label="Estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {(Object.keys(STATUS) as NotificationStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS[value][0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={(value) => filterBy(setChannel)(value as Filter<NotificationChannel>)}>
          <SelectTrigger className="h-11 w-40 bg-card" aria-label="Canal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(value) => filterBy(setCategory)(value as Filter<NotificationCategory>)}>
          <SelectTrigger className="h-11 w-40 bg-card" aria-label="Tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(CATEGORIES) as NotificationCategory[]).map((value) => (
              <SelectItem key={value} value={value}>
                {CATEGORIES[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(event) => filterBy(setSearch)(event.target.value)} placeholder="Procurar nome, email ou telefone" aria-label="Procurar" className="h-11 bg-card pl-9" />
        </div>
      </div>

      {log.isPending ? (
        <ListSkeleton rows={8} />
      ) : !log.data ? (
        <ErrorState error={log.error} onRetry={() => void log.refetch()} />
      ) : log.data.rows.length === 0 ? (
        <EmptyState icon={Bell} title={status === 'failed' ? 'Nenhuma falha' : 'Sem avisos'}>
          {status === 'all' && channel === 'all' && category === 'all' && !term ? 'Os avisos às famílias e à equipa aparecem aqui à medida que são enviados.' : 'Nada corresponde a estes filtros.'}
        </EmptyState>
      ) : (
        <>
          <ul className={cn('divide-y overflow-hidden rounded-2xl border bg-card', log.isPlaceholderData && 'opacity-60')}>
            {log.data.rows.map((row) => (
              <Row key={row._id} row={row} />
            ))}
          </ul>
          {log.data.pages > 1 && (
            <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Páginas">
              <Button variant="outline" className="h-11" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft aria-hidden />
                Mais recentes
              </Button>
              <span className="text-muted-foreground">
                Página {page} de {log.data.pages}
              </span>
              <Button variant="outline" className="h-11" disabled={page >= log.data.pages} onClick={() => setPage(page + 1)}>
                Mais antigas
                <ChevronRight aria-hidden />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function Row({ row }: { row: NotificationRow }) {
  const resend = useResendNotification();
  const [label, pill] = STATUS[row.status];
  const Icon = row.channel === 'whatsapp' ? MessageCircle : Mail;
  const name = row.user_id ? `${row.user_id.firstName} ${row.user_id.lastName}` : null;
  const contact = row.channel === 'whatsapp' ? formatPhone(row.recipient) : row.recipient;
  const problem = row.status === 'failed' || row.status === 'skipped';

  const send = async () => {
    try {
      await resend.mutateAsync(row._id);
      toast.success('Aviso reenviado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível reenviar.');
    }
  };

  return (
    <li className="grid gap-2 px-4 py-3 sm:grid-cols-[auto_1.3fr_1.2fr_13rem] sm:items-center sm:gap-4">
      <span className={cn('hidden size-9 items-center justify-center rounded-lg sm:flex', row.channel === 'whatsapp' ? 'bg-green-tint text-green-text' : 'bg-teal-tint text-teal-text')}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold">{name ?? contact}</p>
        <p className="truncate text-sm text-muted-foreground">
          <span className="sm:hidden">{row.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · </span>
          {name ? contact : 'Pedido de matrícula'}
        </p>
      </div>
      <div className="min-w-0 text-sm">
        <p>
          {templateLabel(row.template)}
          <span className="text-muted-foreground"> · {CATEGORIES[row.category]}</span>
          {row.fallback_of && <span className="text-muted-foreground"> · em vez do WhatsApp</span>}
          {row.resend_of && <span className="text-muted-foreground"> · reenvio</span>}
        </p>
        <p className="text-muted-foreground tabular-nums">
          {formatDate(row.createdAt)} às {formatTime(row.createdAt)}
          {row.attempts > 1 && ` · ${row.attempts} tentativas`}
        </p>
        {problem && row.error && <p className="mt-0.5 text-xs break-words text-destructive">{row.error}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', pill)}>{label}</span>
        {problem &&
          (row.handled ? (
            <span className="text-xs text-muted-foreground">Já reenviado</span>
          ) : row.resendable ? (
            <Button variant="outline" size="sm" className="h-9" disabled={resend.isPending} onClick={() => void send()}>
              <RotateCcw aria-hidden />
              {resend.isPending ? 'A reenviar…' : 'Reenviar'}
            </Button>
          ) : row.category === 'account' ? (
            <Link href="/admin/pessoas" className="text-xs font-semibold text-green-text underline-offset-2 hover:underline">
              Reenviar em Pessoas
            </Link>
          ) : null)}
      </div>
    </li>
  );
}
