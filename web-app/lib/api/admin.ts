'use client';

/**
 * Data for the administration screens (laptops, online). Lists are small enough for one page
 * of 100; mutations refresh the lists they change.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  AdminUser,
  Attendance,
  CalendarEvent,
  Child,
  ClassInfo,
  DailyReport,
  Delivery,
  Enrollment,
  EnrollmentStatus,
  FinanceSummary,
  Guardian,
  MonthlyReport,
  PaymentClaim,
  PickupPerson,
  StaffAssignment,
  UserRow,
  UserStatus
} from './types';

type Params = Record<string, string | number | undefined>;

async function list<T>(path: string, params: Params = {}): Promise<{ rows: T[]; total: number }> {
  const res = await api.get<T[]>(path, { limit: 100, ...params });
  return { rows: res.data, total: res.pagination?.total ?? res.data.length };
}

// --- Lists ---

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => (await list<ClassInfo>('/classes')).rows,
    select: (rows) => [...rows].sort((a, b) => (a.min_age_months ?? 0) - (b.min_age_months ?? 0) || a.name.localeCompare(b.name, 'pt'))
  });
}

export function useAssignments() {
  return useQuery({ queryKey: ['staff-assignments', 'all'], queryFn: async () => (await list<StaffAssignment>('/staff-assignments')).rows });
}

/** Every child (the administration sees all), by name. */
export function useAllChildren() {
  return useQuery({
    queryKey: ['children', 'all'],
    queryFn: async () => (await list<Child>('/children')).rows,
    select: (rows) => [...rows].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  });
}

export function useEnrollments(status?: EnrollmentStatus) {
  return useQuery({
    queryKey: ['enrollments', status ?? 'all'],
    queryFn: async () => (await list<Enrollment>('/enrollments', { status })).rows
  });
}

export function useUsers(filter: { role?: string; status?: UserStatus | 'all'; search?: string } = {}) {
  return useQuery({
    queryKey: ['users', filter.role ?? '', filter.status ?? 'all', filter.search ?? ''],
    queryFn: async () => (await list<UserRow>('/users', { status: filter.status ?? 'all', role: filter.role, search: filter.search || undefined })).rows
  });
}

export function useUser(id: string | null) {
  return useQuery({ queryKey: ['users', 'one', id], queryFn: async () => (await api.get<AdminUser>(`/users/${id}`)).data, enabled: !!id });
}

export function useChildContacts(childId: string | null) {
  const guardians = useQuery({
    queryKey: ['guardians', childId],
    queryFn: async () => (await list<Guardian>('/guardians', { child_id: childId! })).rows,
    enabled: !!childId
  });
  const pickup = useQuery({
    queryKey: ['pickup-persons', 'child', childId],
    queryFn: async () => (await list<PickupPerson>('/pickup-persons', { child_id: childId! })).rows,
    enabled: !!childId
  });
  return { guardians, pickup };
}

/** A child's attendance between two centre days (YYYY-MM-DD). */
export function useChildAttendance(childId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['attendance', 'child', childId, from, to],
    queryFn: async () => (await list<Attendance>('/attendance', { child_id: childId!, start_date: from, end_date: to })).rows,
    enabled: !!childId
  });
}

// --- Dashboard ---

export function useDashboard(day: string) {
  const enrollments = useQuery({
    queryKey: ['enrollments', 'open'],
    queryFn: async () => {
      const [submitted, review] = await Promise.all([list<Enrollment>('/enrollments', { status: 'submitted' }), list<Enrollment>('/enrollments', { status: 'under_review' })]);
      return [...submitted.rows, ...review.rows];
    }
  });
  const claims = useQuery({ queryKey: ['payment-claims', 'pending'], queryFn: async () => (await list<PaymentClaim>('/payment-claims', { status: 'pending' })).total });
  const finance = useQuery({
    queryKey: ['reports', 'finance', day.slice(0, 7)],
    queryFn: async () => (await api.get<FinanceSummary>('/reports/finance/summary', { from: `${day.slice(0, 7)}-01`, to: day })).data
  });
  const monthly = useQuery({ queryKey: ['monthly-reports', 'all'], queryFn: async () => (await list<MonthlyReport>('/monthly-reports')).rows });
  const invited = useQuery({ queryKey: ['users', 'invited-count'], queryFn: async () => (await list<UserRow>('/users', { status: 'invited' })).total });
  const attendance = useQuery({ queryKey: ['attendance', day, 'all'], queryFn: async () => (await list<Attendance>('/attendance', { date: day })).rows });
  const reports = useQuery({
    queryKey: ['daily-report', day, 'all'],
    queryFn: async () => (await list<DailyReport>('/daily-reports', { start_date: day, end_date: day })).rows
  });
  const events = useQuery({ queryKey: ['calendar-events', 'upcoming', day], queryFn: async () => (await list<CalendarEvent>('/calendar-events', { start_date: day })).rows });
  return { enrollments, claims, finance, monthly, invited, attendance, reports, events };
}

// --- Actions ---

function useInvalidating<TInput, TResult>(fn: (input: TInput) => Promise<TResult>, keys: string[][]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}

export interface ApprovalResult {
  parent: { id: string; created: boolean };
  inviteLink?: string;
  delivery?: Delivery;
}

export function useApproveEnrollment() {
  return useInvalidating(
    async (input: { id: string; classId: string; startDate?: string; overrideCapacity: boolean }) =>
      (
        await api.post<ApprovalResult>(`/enrollments/${input.id}/approve`, {
          class_id: input.classId,
          ...(input.startDate && { start_date: `${input.startDate}T12:00:00+02:00` }),
          override_capacity: input.overrideCapacity
        })
      ).data,
    [['enrollments'], ['children'], ['users']]
  );
}

export function useRejectEnrollment() {
  return useInvalidating((input: { id: string; reason: string }) => api.post(`/enrollments/${input.id}/reject`, { reason: input.reason }), [['enrollments']]);
}

export function useMarkUnderReview() {
  return useInvalidating((id: string) => api.put(`/enrollments/${id}`, { status: 'under_review' }), [['enrollments']]);
}

export interface InviteResult {
  user: AdminUser;
  inviteLink?: string;
  resetLink?: string;
  delivery: Delivery;
}

export function useCreateUser() {
  return useInvalidating(
    async (input: { firstName: string; lastName: string; role: UserRow['role']; phone: string; email: string; whatsappOptIn: boolean }) =>
      (await api.post<InviteResult>('/users', input)).data,
    [['users']]
  );
}

export function useUpdateUser() {
  return useInvalidating(
    async (input: { id: string; changes: Partial<Pick<AdminUser, 'firstName' | 'lastName' | 'email' | 'phone' | 'role' | 'whatsappOptIn'>> }) =>
      (await api.put<AdminUser>(`/users/${input.id}`, input.changes)).data,
    [['users']]
  );
}

export function useSetUserStatus() {
  return useInvalidating(async (input: { id: string; status: UserStatus }) => (await api.patch<AdminUser>(`/users/${input.id}/status`, { status: input.status })).data, [['users']]);
}

export function useResendInvite() {
  return useInvalidating(async (id: string) => (await api.post<InviteResult>(`/users/${id}/resend-invite`)).data, [['users']]);
}

export function usePasswordResetLink() {
  return useMutation({ mutationFn: async (id: string) => (await api.post<InviteResult>(`/users/${id}/password-reset-link`)).data });
}

export function useSaveClass() {
  return useInvalidating(
    async (input: { id?: string; name: string; min_age_months: number; max_age_months: number; capacity: number }) => {
      const { id, ...body } = input;
      return id ? api.put<ClassInfo>(`/classes/${id}`, body) : api.post<ClassInfo>('/classes', body);
    },
    [['classes']]
  );
}

export function useDeleteClass() {
  return useInvalidating((id: string) => api.delete(`/classes/${id}`), [['classes']]);
}

export function useAssignStaff() {
  return useInvalidating((input: { staffId: string; classId: string }) => api.post('/staff-assignments', { staff_id: input.staffId, class_id: input.classId }), [['staff-assignments']]);
}

export function useUnassignStaff() {
  return useInvalidating((id: string) => api.delete(`/staff-assignments/${id}`), [['staff-assignments']]);
}

export function useUpdateChild() {
  return useInvalidating(async (input: { id: string; changes: Record<string, unknown> }) => (await api.put<Child>(`/children/${input.id}`, input.changes)).data, [['children']]);
}

export function useAddPickupPerson() {
  return useInvalidating(
    (input: { childId: string; name: string; relationship: string; phone: string; photo?: Blob }) => {
      const form = new FormData();
      form.append('child_id', input.childId);
      form.append('name', input.name);
      form.append('relationship', input.relationship);
      form.append('phone', input.phone);
      if (input.photo) form.append('photo', input.photo, 'foto.jpg');
      return api.post<PickupPerson>('/pickup-persons', form);
    },
    [['pickup-persons']]
  );
}

export function useRemovePickupPerson() {
  return useInvalidating((id: string) => api.delete(`/pickup-persons/${id}`), [['pickup-persons']]);
}
