'use client';

/**
 * Data for the parent (Encarregado de Educação) screens. The API only returns the parent's own
 * children and invoices, and only validated monthly reports. Parents read online; queries they
 * open most (children, today, invoices) are also kept on the device.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { CalendarEvent, ClaimMethod, DailyReport, Invoice, MonthlyReport, Payment, PaymentClaim, PickupPerson } from './types';
import { maputoDay } from '@/lib/offline/queue';

const OFFLINE = { offline: true };

async function list<T>(path: string, params: Record<string, string | number> = {}): Promise<T[]> {
  return (await api.get<T[]>(path, { limit: 100, ...params })).data;
}

/** "YYYY-MM-DD", `days` before the given centre day. */
export function daysBefore(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Daily reports of one child, the last `days` days, newest first. */
export function useChildReports(childId: string | undefined, days = 14) {
  const today = maputoDay();
  return useQuery({
    queryKey: ['daily-report', 'child', childId, days],
    queryFn: () => list<DailyReport>('/daily-reports', { child_id: childId!, start_date: daysBefore(today, days - 1), end_date: today }),
    enabled: !!childId,
    select: (rows) => [...rows].sort((a, b) => b.date.localeCompare(a.date))
  });
}

/** Validated monthly reports (the API hides drafts from parents), newest first. */
export function useMonthlyReports() {
  return useQuery({
    queryKey: ['monthly-reports'],
    queryFn: () => list<MonthlyReport>('/monthly-reports'),
    select: (rows) => [...rows].sort((a, b) => b.year - a.year || b.month - a.month)
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => list<Invoice>('/invoices'),
    meta: OFFLINE,
    select: (rows) => [...rows].sort((a, b) => b.due_date.localeCompare(a.due_date))
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => list<Payment>('/payments'),
    meta: OFFLINE,
    select: (rows) => [...rows].sort((a, b) => b.payment_date.localeCompare(a.payment_date))
  });
}

/** "Já paguei" notices sent by the parent, newest first. */
export function usePaymentClaims() {
  return useQuery({ queryKey: ['payment-claims'], queryFn: () => list<PaymentClaim>('/payment-claims'), meta: OFFLINE });
}

/** Events from today on (centre-wide and the children's classes). */
export function useUpcomingEvents() {
  const today = maputoDay();
  return useQuery({
    queryKey: ['calendar-events', 'upcoming', today],
    queryFn: () => list<CalendarEvent>('/calendar-events', { start_date: today }),
    meta: OFFLINE,
    select: (rows) => [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date))
  });
}

/** Everyone allowed to collect the parent's children (permanent, and one-day from today on). */
export function useParentPickupPeople() {
  return useQuery({ queryKey: ['pickup-persons', 'parent'], queryFn: () => list<PickupPerson>('/pickup-persons'), meta: OFFLINE });
}

// --- Actions ---

/** "Avisar ausência": the child won't come on that day (an excused absence the educators see). */
export function useAbsenceNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { childId: string; day: string; reason: string }) =>
      api.post('/attendance/absence-notice', { child_id: input.childId, date: `${input.day}T12:00:00+02:00`, reason: input.reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] })
  });
}

/** Someone else collects the child today (with an optional photo, so the educator can check). */
export function useAddPickupToday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { childId: string; name: string; relationship: string; phone: string; photo?: Blob }) => {
      const form = new FormData();
      form.append('child_id', input.childId);
      form.append('name', input.name);
      form.append('relationship', input.relationship);
      form.append('phone', input.phone);
      if (input.photo) form.append('photo', input.photo, 'foto.jpg');
      return api.post<PickupPerson>('/pickup-persons/today', form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pickup-persons'] })
  });
}

export function useCancelPickupToday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pickup-persons/today/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pickup-persons'] })
  });
}

/** "Já paguei": the parent sends the M-Pesa / e-Mola / transfer reference; the administration confirms. */
export function useClaimPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { invoiceId: string; amount: number; method: ClaimMethod; reference: string; paidOn: string }) =>
      api.post<PaymentClaim>('/payment-claims', {
        invoice_id: input.invoiceId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        paid_on: `${input.paidOn}T12:00:00+02:00`
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-claims'] })
  });
}
