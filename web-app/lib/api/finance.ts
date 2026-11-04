'use client';

/**
 * Administration data for invoices, payments, "Já paguei" notices, expenses, reports, monthly
 * reports and events (the screens of Phase 3d).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  AdminPaymentClaim,
  AttendanceReport,
  CalendarEvent,
  Expense,
  ExpenseCategory,
  ExpensesReport,
  FinanceReport,
  Invoice,
  InvoiceStatus,
  MonthlyReport,
  Payment,
  PaymentsReport
} from './types';

type Params = Record<string, string | number | undefined>;

async function list<T>(path: string, params: Params = {}): Promise<T[]> {
  return (await api.get<T[]>(path, { limit: 100, ...params })).data;
}

function useInvalidating<TInput, TResult>(fn: (input: TInput) => Promise<TResult>, keys: string[][]) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))) });
}

// --- Invoices and payments ---

export function useAllInvoices(status?: InvoiceStatus) {
  return useQuery({
    queryKey: ['invoices', 'admin', status ?? 'all'],
    queryFn: () => list<Invoice>('/invoices', { status }),
    select: (rows) => [...rows].sort((a, b) => b.issue_date.localeCompare(a.issue_date) || b.invoice_number.localeCompare(a.invoice_number))
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: ['payments', 'admin'],
    queryFn: () => list<Payment & { child_id: unknown; parent_id: unknown }>('/payments'),
    select: (rows) => [...rows].sort((a, b) => b.payment_date.localeCompare(a.payment_date))
  });
}

export function usePendingClaims() {
  return useQuery({ queryKey: ['payment-claims', 'pending', 'list'], queryFn: () => list<AdminPaymentClaim>('/payment-claims', { status: 'pending' }) });
}

const FINANCE_KEYS = [['invoices'], ['payments'], ['payment-claims'], ['reports']];

export function useConfirmClaim() {
  return useInvalidating((input: { id: string; amount?: number }) => api.patch(`/payment-claims/${input.id}/confirm`, input.amount ? { amount: input.amount } : {}), FINANCE_KEYS);
}

export function useRejectClaim() {
  return useInvalidating((input: { id: string; reason: string }) => api.patch(`/payment-claims/${input.id}/reject`, { reason: input.reason }), FINANCE_KEYS);
}

export function useGenerateInvoices() {
  return useInvalidating(
    async (input: { period: string; dueDate: string; amounts: { class_id: string; amount: number }[] }) =>
      (await api.post<{ created: number; skipped: number }>('/invoices/generate', { period: input.period, due_date: `${input.dueDate}T12:00:00+02:00`, amounts: input.amounts })).data,
    FINANCE_KEYS
  );
}

export function useCreateInvoice() {
  return useInvalidating(
    (input: { childId: string; parentId: string; dueDate: string; items: { description: string; quantity: number; unit_price: number }[]; notes: string }) => {
      const items = input.items.map((item) => ({ ...item, total: item.quantity * item.unit_price }));
      return api.post<Invoice>('/invoices', {
        child_id: input.childId,
        parent_id: input.parentId,
        due_date: `${input.dueDate}T12:00:00+02:00`,
        items,
        amount: items.reduce((sum, item) => sum + item.total, 0),
        notes: input.notes
      });
    },
    FINANCE_KEYS
  );
}

export function useSetInvoiceStatus() {
  return useInvalidating((input: { id: string; status: InvoiceStatus }) => api.patch(`/invoices/${input.id}/status`, { status: input.status }), FINANCE_KEYS);
}

export function useRecordPayment() {
  return useInvalidating(
    (input: { invoice: Invoice; amount: number; date: string; method: string; details: string; reference: string }) =>
      api.post('/payments', {
        invoice_id: input.invoice._id,
        parent_id: typeof input.invoice.parent_id === 'object' && input.invoice.parent_id ? input.invoice.parent_id._id : input.invoice.parent_id,
        child_id: typeof input.invoice.child_id === 'object' && input.invoice.child_id ? input.invoice.child_id._id : input.invoice.child_id,
        amount: input.amount,
        payment_date: `${input.date}T12:00:00+02:00`,
        payment_method: input.method,
        payment_method_details: input.details,
        reference_number: input.reference
      }),
    FINANCE_KEYS
  );
}

// --- Expenses ---

export function useExpenseCategories() {
  return useQuery({ queryKey: ['expense-categories'], queryFn: () => list<ExpenseCategory>('/expense-categories') });
}

export function useAddExpenseCategory() {
  return useInvalidating((name: string) => api.post<ExpenseCategory>('/expense-categories', { name }), [['expense-categories']]);
}

export function useExpenses(from: string, to: string) {
  return useQuery({
    queryKey: ['expenses', from, to],
    queryFn: () => list<Expense>('/expenses', { start_date: from, end_date: to }),
    select: (rows) => [...rows].sort((a, b) => b.expense_date.localeCompare(a.expense_date))
  });
}

export function useSaveExpense() {
  return useInvalidating(
    (input: { id?: string; categoryId: string; amount: number; description: string; date: string; vendor: string; receipt?: Blob; receiptName?: string }) => {
      const form = new FormData();
      form.append('category_id', input.categoryId);
      form.append('amount', String(input.amount));
      form.append('description', input.description);
      form.append('expense_date', `${input.date}T12:00:00+02:00`);
      form.append('vendor', input.vendor);
      if (input.receipt) form.append('receipt', input.receipt, input.receiptName ?? 'recibo');
      return input.id ? api.put<Expense>(`/expenses/${input.id}`, form) : api.post<Expense>('/expenses', form);
    },
    [['expenses'], ['reports']]
  );
}

export function useDeleteExpense() {
  return useInvalidating((id: string) => api.delete(`/expenses/${id}`), [['expenses'], ['reports']]);
}

// --- Reports (period: YYYY-MM-DD to YYYY-MM-DD) ---

export function useFinanceReport(from: string, to: string) {
  return useQuery({ queryKey: ['reports', 'finance', from, to], queryFn: async () => (await api.get<FinanceReport>('/reports/finance/summary', { from, to })).data });
}

export function usePaymentsReport(from: string, to: string) {
  return useQuery({ queryKey: ['reports', 'payments', from, to], queryFn: async () => (await api.get<PaymentsReport>('/reports/payments', { from, to })).data });
}

export function useExpensesReport(from: string, to: string) {
  return useQuery({ queryKey: ['reports', 'expenses', from, to], queryFn: async () => (await api.get<ExpensesReport>('/reports/expenses', { from, to })).data });
}

export function useAttendanceReport(month: string, classId?: string) {
  return useQuery({
    queryKey: ['reports', 'attendance', month, classId ?? 'all'],
    queryFn: async () => (await api.get<AttendanceReport>('/reports/attendance', { month, class_id: classId })).data
  });
}

// --- Monthly reports ---

export function useMonthlyReportsAll(params: { month?: number; year?: number } = {}) {
  return useQuery({
    queryKey: ['monthly-reports', 'all', params.month ?? '', params.year ?? ''],
    queryFn: () => list<MonthlyReport>('/monthly-reports', { month: params.month, year: params.year })
  });
}

export function useValidateMonthly() {
  return useInvalidating((id: string) => api.patch(`/monthly-reports/${id}/validate`), [['monthly-reports']]);
}

export function useRejectMonthly() {
  return useInvalidating((input: { id: string; reason: string }) => api.patch(`/monthly-reports/${input.id}/reject`, { rejection_reason: input.reason }), [['monthly-reports']]);
}

export type MonthlyFields = Pick<
  MonthlyReport,
  'physical_development' | 'cognitive_development' | 'social_development' | 'emotional_development' | 'achievements' | 'areas_for_improvement' | 'general_notes' | 'recommendations' | 'attendance_summary'
>;

export function useSaveMonthly() {
  return useInvalidating(
    async (input: { id?: string; childId: string; month: number; year: number; status: 'draft' | 'submitted'; fields: MonthlyFields }) =>
      input.id
        ? (await api.put<MonthlyReport>(`/monthly-reports/${input.id}`, { ...input.fields, status: input.status })).data
        : (await api.post<MonthlyReport>('/monthly-reports', { ...input.fields, child_id: input.childId, month: input.month, year: input.year, status: input.status })).data,
    [['monthly-reports']]
  );
}

// --- Events ---

export function useAllEvents(from: string) {
  return useQuery({
    queryKey: ['calendar-events', 'admin', from],
    queryFn: () => list<CalendarEvent>('/calendar-events', { start_date: from }),
    select: (rows) => [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date))
  });
}

export function useSaveEvent() {
  return useInvalidating(
    (input: { id?: string; title: string; description: string; start: string; end?: string; allDay: boolean; type: string; classId?: string }) => {
      const body = {
        title: input.title,
        description: input.description,
        start_date: input.start,
        ...(input.end && { end_date: input.end }),
        is_all_day: input.allDay,
        event_type: input.type,
        // null on an edit makes it a whole-centre event
        ...(input.classId ? { class_id: input.classId } : input.id ? { class_id: null } : {})
      };
      return input.id ? api.put<CalendarEvent>(`/calendar-events/${input.id}`, body) : api.post<CalendarEvent>('/calendar-events', body);
    },
    [['calendar-events']]
  );
}

export function useDeleteEvent() {
  return useInvalidating((id: string) => api.delete(`/calendar-events/${id}`), [['calendar-events']]);
}

/** A message to everyone with a role ("Comunicado"; administration only). */
export function useBroadcast() {
  return useInvalidating(
    (input: { role: 'responsavel' | 'staff'; subject: string; content: string }) => api.post('/messages', { recipient_role: input.role, subject: input.subject, content: input.content, message_type: 'info' }),
    [['messages']]
  );
}
