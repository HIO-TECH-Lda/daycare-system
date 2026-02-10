/**
 * Centralized query keys for TanStack Query.
 * Use these for useQuery/useMutation queryKey and for invalidating queries.
 *
 * Example:
 *   useQuery({ queryKey: queryKeys.children.list(), ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.children.all })
 */

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  children: {
    all: ['children'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.children.all, 'list', filters] as const
        : [...queryKeys.children.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.children.all, 'detail', id] as const,
  },
  classes: {
    all: ['classes'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.classes.all, 'list', filters] as const
        : [...queryKeys.classes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.classes.all, 'detail', id] as const,
  },
  guardians: {
    all: ['guardians'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.guardians.all, 'list', filters] as const
        : [...queryKeys.guardians.all, 'list'] as const,
    byChild: (childId: string) => [...queryKeys.guardians.all, 'child', childId] as const,
    detail: (id: string) => [...queryKeys.guardians.all, 'detail', id] as const,
  },
  pickupPersons: {
    all: ['pickupPersons'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.pickupPersons.all, 'list', filters] as const
        : [...queryKeys.pickupPersons.all, 'list'] as const,
    byChild: (childId: string) => [...queryKeys.pickupPersons.all, 'child', childId] as const,
    detail: (id: string) => [...queryKeys.pickupPersons.all, 'detail', id] as const,
  },
  dailyReports: {
    all: ['dailyReports'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.dailyReports.all, 'list', filters] as const
        : [...queryKeys.dailyReports.all, 'list'] as const,
    byChild: (childId: string, filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.dailyReports.all, 'child', childId, filters] as const
        : [...queryKeys.dailyReports.all, 'child', childId] as const,
    detail: (id: string) => [...queryKeys.dailyReports.all, 'detail', id] as const,
  },
  activities: {
    all: ['activities'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.activities.all, 'list', filters] as const
        : [...queryKeys.activities.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.activities.all, 'detail', id] as const,
  },
  reportPhotos: {
    all: ['reportPhotos'] as const,
    byReport: (reportId: string) => [...queryKeys.reportPhotos.all, 'report', reportId] as const,
    detail: (id: string) => [...queryKeys.reportPhotos.all, 'detail', id] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.attendance.all, 'list', filters] as const
        : [...queryKeys.attendance.all, 'list'] as const,
    byChild: (childId: string, filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.attendance.all, 'child', childId, filters] as const
        : [...queryKeys.attendance.all, 'child', childId] as const,
    detail: (id: string) => [...queryKeys.attendance.all, 'detail', id] as const,
  },
  calendarEvents: {
    all: ['calendarEvents'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.calendarEvents.all, 'list', filters] as const
        : [...queryKeys.calendarEvents.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.calendarEvents.all, 'detail', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.invoices.all, 'list', filters] as const
        : [...queryKeys.invoices.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.invoices.all, 'detail', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.payments.all, 'list', filters] as const
        : [...queryKeys.payments.all, 'list'] as const,
    byInvoice: (invoiceId: string) => [...queryKeys.payments.all, 'invoice', invoiceId] as const,
    detail: (id: string) => [...queryKeys.payments.all, 'detail', id] as const,
  },
  expenseCategories: {
    all: ['expenseCategories'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.expenseCategories.all, 'list', filters] as const
        : [...queryKeys.expenseCategories.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.expenseCategories.all, 'detail', id] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.expenses.all, 'list', filters] as const
        : [...queryKeys.expenses.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.expenses.all, 'detail', id] as const,
  },
  messages: {
    all: ['messages'] as const,
    inbox: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.messages.all, 'inbox', filters] as const
        : [...queryKeys.messages.all, 'inbox'] as const,
    sent: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.messages.all, 'sent', filters] as const
        : [...queryKeys.messages.all, 'sent'] as const,
    detail: (id: string) => [...queryKeys.messages.all, 'detail', id] as const,
  },
  monthlyReports: {
    all: ['monthlyReports'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.monthlyReports.all, 'list', filters] as const
        : [...queryKeys.monthlyReports.all, 'list'] as const,
    byChild: (childId: string, filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.monthlyReports.all, 'child', childId, filters] as const
        : [...queryKeys.monthlyReports.all, 'child', childId] as const,
    detail: (id: string) => [...queryKeys.monthlyReports.all, 'detail', id] as const,
  },
  staffAssignments: {
    all: ['staffAssignments'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.staffAssignments.all, 'list', filters] as const
        : [...queryKeys.staffAssignments.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.staffAssignments.all, 'detail', id] as const,
  },
} as const;
