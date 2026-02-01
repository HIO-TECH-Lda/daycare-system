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
    list: () => [...queryKeys.children.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.children.all, 'detail', id] as const,
  },
  classes: {
    all: ['classes'] as const,
    list: () => [...queryKeys.classes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.classes.all, 'detail', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: () => [...queryKeys.invoices.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.invoices.all, 'detail', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: () => [...queryKeys.payments.all, 'list'] as const,
  },
  messages: {
    all: ['messages'] as const,
    list: (participantId?: string) =>
      participantId
        ? (['messages', participantId] as const)
        : (['messages'] as const),
  },
  calendarEvents: {
    all: ['calendarEvents'] as const,
    list: () => [...queryKeys.calendarEvents.all, 'list'] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    list: (date?: string) =>
      date ? (['attendance', date] as const) : (['attendance'] as const),
  },
  staff: {
    all: ['staff'] as const,
    list: () => [...queryKeys.staff.all, 'list'] as const,
    assignments: () => [...queryKeys.staff.all, 'assignments'] as const,
  },
  monthlyReports: {
    all: ['monthlyReports'] as const,
    list: (childId?: string) =>
      childId
        ? (['monthlyReports', childId] as const)
        : (['monthlyReports'] as const),
  },
} as const;
