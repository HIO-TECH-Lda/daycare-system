/**
 * Comprehensive API service functions for all endpoints.
 * All functions use the api-client helpers and return typed responses.
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  ApiResponseBody,
} from './api-client';
import type {
  User,
  Class,
  Child,
  Guardian,
  AuthorizedPickupPerson as PickupPerson,
  DailyReport,
  Activity,
  ReportPhoto,
  Attendance,
  CalendarEvent,
  Invoice,
  Payment,
  ExpenseCategory,
  Expense,
  Message,
  MonthlyReport,
  StaffAssignment,
} from './types';

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Filter parameters for various endpoints
export interface ChildrenFilters extends PaginationParams {
  child_id?: string;
}

export interface DailyReportsFilters extends PaginationParams {
  child_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface AttendanceFilters extends PaginationParams {
  child_id?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
}

export interface CalendarEventsFilters extends PaginationParams {
  start_date?: string;
  end_date?: string;
  class_id?: string;
}

export interface InvoicesFilters extends PaginationParams {
  parent_id?: string;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

export interface PaymentsFilters extends PaginationParams {
  invoice_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface ExpensesFilters extends PaginationParams {
  category_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface MessagesFilters extends PaginationParams {
  unread_only?: boolean;
}

export interface MonthlyReportsFilters extends PaginationParams {
  child_id?: string;
  month?: number;
  year?: number;
}

export interface ActivitiesFilters extends PaginationParams {
  class_id?: string;
  active_only?: boolean;
}

export interface StaffAssignmentsFilters extends PaginationParams {
  staff_id?: string;
}

export interface GuardiansFilters extends PaginationParams {
  child_id?: string;
}

export interface PickupPersonsFilters extends PaginationParams {
  child_id?: string;
}

// ============================================================================
// Classes API
// ============================================================================

export const classesApi = {
  list: (params?: PaginationParams) =>
    apiGet<Class[]>('/classes', { params }),

  get: (id: string) =>
    apiGet<Class>(`/classes/${id}`),

  create: (data: {
    name: string;
    min_age_months: number;
    max_age_months: number;
    capacity: number;
  }) =>
    apiPost<Class>('/classes', data),

  update: (id: string, data: Partial<{
    name: string;
    min_age_months: number;
    max_age_months: number;
    capacity: number;
  }>) =>
    apiPut<Class>(`/classes/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/classes/${id}`),
};

// ============================================================================
// Children API
// ============================================================================

export const childrenApi = {
  list: (params?: ChildrenFilters) =>
    apiGet<Child[]>('/children', { params }),

  get: (id: string) =>
    apiGet<Child>(`/children/${id}`),

  create: (data: {
    name: string;
    birth_date: string;
    class_id: string;
    parent_id: string;
    gender?: 'Masculino' | 'Feminino';
    photo_url?: string;
    allergies?: string;
    medications?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    nationality?: string;
    address?: string;
    languages_spoken?: string;
    dietary_restrictions?: string;
    sleep_schedule?: string;
    preferred_foods?: string;
    separation_reaction?: string;
    plays_with_others?: boolean;
    behavior_notes?: string;
    previous_center?: string;
    transfer_reason?: string;
    image_usage_authorized?: boolean;
    enrollment_signature?: string;
    enrollment_date?: string;
  }) =>
    apiPost<Child>('/children', data),

  update: (id: string, data: Partial<Omit<Child, 'id'>>) =>
    apiPut<Child>(`/children/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/children/${id}`),
};

// ============================================================================
// Staff Assignments API
// ============================================================================

export const staffAssignmentsApi = {
  list: (params?: StaffAssignmentsFilters) =>
    apiGet<StaffAssignment[]>('/staff-assignments', { params }),

  create: (data: {
    staff_id: string;
    class_id: string;
  }) =>
    apiPost<StaffAssignment>('/staff-assignments', data),

  delete: (id: string) =>
    apiDelete(`/staff-assignments/${id}`),
};

// ============================================================================
// Guardians API
// ============================================================================

export const guardiansApi = {
  list: (params?: GuardiansFilters) =>
    apiGet<Guardian[]>('/guardians', { params }),

  getByChild: (childId: string) =>
    apiGet<Guardian[]>(`/guardians/child/${childId}`),

  create: (data: {
    child_id: string;
    name: string;
    profession?: string;
    workplace?: string;
    relationship?: string;
    phone?: string;
    email?: string;
    address?: string;
    guardian_type: 1 | 2;
  }) =>
    apiPost<Guardian>('/guardians', data),

  update: (id: string, data: Partial<Omit<Guardian, 'id' | 'child_id'>>) =>
    apiPut<Guardian>(`/guardians/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/guardians/${id}`),
};

// ============================================================================
// Pickup Persons API
// ============================================================================

export const pickupPersonsApi = {
  list: (params?: PickupPersonsFilters) =>
    apiGet<PickupPerson[]>('/pickup-persons', { params }),

  getByChild: (childId: string) =>
    apiGet<PickupPerson[]>(`/pickup-persons/child/${childId}`),

  create: (data: {
    child_id: string;
    name: string;
    relationship?: string;
    phone?: string;
    email?: string;
    id_document?: string;
    photo_url?: string;
    is_authorized?: boolean;
  }) =>
    apiPost<PickupPerson>('/pickup-persons', data),

  update: (id: string, data: Partial<Omit<PickupPerson, 'id' | 'child_id'>>) =>
    apiPut<PickupPerson>(`/pickup-persons/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/pickup-persons/${id}`),
};

// ============================================================================
// Daily Reports API
// ============================================================================

export const dailyReportsApi = {
  list: (params?: DailyReportsFilters) =>
    apiGet<DailyReport[]>('/daily-reports', { params }),

  getByChild: (childId: string, params?: { start_date?: string; end_date?: string }) =>
    apiGet<DailyReport[]>(`/daily-reports/child/${childId}`, { params }),

  create: (data: {
    child_id: string;
    date: string;
    meals?: {
      breakfast?: string;
      lunch?: string;
      snack?: string;
      dinner?: string;
    };
    activities?: string[];
    nap_time?: {
      start?: string;
      end?: string;
      duration_minutes?: number;
    };
    mood?: string;
    notes?: string;
    behavior_notes?: string;
    health_notes?: string;
  }) =>
    apiPost<DailyReport>('/daily-reports', data),

  update: (id: string, data: Partial<Omit<DailyReport, 'id' | 'child_id' | 'created_by'>>) =>
    apiPut<DailyReport>(`/daily-reports/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/daily-reports/${id}`),
};

// ============================================================================
// Activities API
// ============================================================================

export const activitiesApi = {
  list: (params?: ActivitiesFilters) =>
    apiGet<Activity[]>('/activities', { params }),

  create: (data: {
    name: string;
    description?: string;
    class_id?: string;
    age_group?: string;
    duration_minutes?: number;
    materials_needed?: string[];
    learning_objectives?: string[];
    is_active?: boolean;
  }) =>
    apiPost<Activity>('/activities', data),

  update: (id: string, data: Partial<Omit<Activity, 'id'>>) =>
    apiPut<Activity>(`/activities/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/activities/${id}`),
};

// ============================================================================
// Report Photos API
// ============================================================================

export const reportPhotosApi = {
  getByReport: (reportId: string) =>
    apiGet<ReportPhoto[]>(`/report-photos/report/${reportId}`),

  create: (data: {
    daily_report_id: string;
    photo_url: string;
    caption?: string;
  }) =>
    apiPost<ReportPhoto>('/report-photos', data),

  delete: (id: string) =>
    apiDelete(`/report-photos/${id}`),
};

// ============================================================================
// Attendance API
// ============================================================================

export const attendanceApi = {
  list: (params?: AttendanceFilters) =>
    apiGet<Attendance[]>('/attendance', { params }),

  getByChild: (childId: string, params?: { start_date?: string; end_date?: string }) =>
    apiGet<Attendance[]>(`/attendance/child/${childId}`, { params }),

  create: (data: {
    child_id: string;
    date: string;
    check_in?: string;
    check_out?: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }) =>
    apiPost<Attendance>('/attendance', data),

  update: (id: string, data: Partial<Omit<Attendance, 'id' | 'child_id'>>) =>
    apiPut<Attendance>(`/attendance/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/attendance/${id}`),
};

// ============================================================================
// Calendar Events API
// ============================================================================

export const calendarEventsApi = {
  list: (params?: CalendarEventsFilters) =>
    apiGet<CalendarEvent[]>('/calendar-events', { params }),

  create: (data: {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    is_all_day?: boolean;
    event_type: 'activity' | 'holiday' | 'meeting' | 'other';
    class_id?: string;
  }) =>
    apiPost<CalendarEvent>('/calendar-events', data),

  update: (id: string, data: Partial<Omit<CalendarEvent, 'id'>>) =>
    apiPut<CalendarEvent>(`/calendar-events/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/calendar-events/${id}`),
};

// ============================================================================
// Invoices API
// ============================================================================

export const invoicesApi = {
  list: (params?: InvoicesFilters) =>
    apiGet<Invoice[]>('/invoices', { params }),

  create: (data: {
    child_id: string;
    parent_id: string;
    issue_date: string;
    due_date: string;
    amount: number;
    items: Array<{
      description: string;
      quantity?: number;
      unit_price: number;
      total: number;
    }>;
    notes?: string;
  }) =>
    apiPost<Invoice>('/invoices', data),

  update: (id: string, data: Partial<Omit<Invoice, 'id' | 'invoice_number'>>) =>
    apiPut<Invoice>(`/invoices/${id}`, data),

  updateStatus: (id: string, status: 'pending' | 'paid' | 'overdue' | 'cancelled') =>
    apiPatch<Invoice>(`/invoices/${id}/status`, { status }),

  delete: (id: string) =>
    apiDelete(`/invoices/${id}`),
};

// ============================================================================
// Payments API
// ============================================================================

export const paymentsApi = {
  list: (params?: PaymentsFilters) =>
    apiGet<Payment[]>('/payments', { params }),

  getByInvoice: (invoiceId: string) =>
    apiGet<Payment[]>(`/payments/invoice/${invoiceId}`),

  create: (data: {
    invoice_id?: string;
    parent_id: string;
    child_id: string;
    amount: number;
    payment_date: string;
    payment_method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
    payment_method_details?: string;
    reference_number?: string;
    notes?: string;
  }) =>
    apiPost<Payment>('/payments', data),

  delete: (id: string) =>
    apiDelete(`/payments/${id}`),
};

// ============================================================================
// Expense Categories API
// ============================================================================

export const expenseCategoriesApi = {
  list: (params?: PaginationParams & { active_only?: boolean }) =>
    apiGet<ExpenseCategory[]>('/expense-categories', { params }),

  create: (data: {
    name: string;
    description?: string;
    is_active?: boolean;
  }) =>
    apiPost<ExpenseCategory>('/expense-categories', data),

  update: (id: string, data: Partial<Omit<ExpenseCategory, 'id'>>) =>
    apiPut<ExpenseCategory>(`/expense-categories/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/expense-categories/${id}`),
};

// ============================================================================
// Expenses API
// ============================================================================

export const expensesApi = {
  list: (params?: ExpensesFilters) =>
    apiGet<Expense[]>('/expenses', { params }),

  create: (data: {
    category_id: string;
    amount: number;
    description: string;
    expense_date: string;
    receipt_url?: string;
    vendor?: string;
  }) =>
    apiPost<Expense>('/expenses', data),

  update: (id: string, data: Partial<Omit<Expense, 'id'>>) =>
    apiPut<Expense>(`/expenses/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/expenses/${id}`),
};

// ============================================================================
// Messages API
// ============================================================================

export const messagesApi = {
  getInbox: (params?: MessagesFilters) =>
    apiGet<Message[]>('/messages/inbox', { params }),

  getSent: (params?: PaginationParams) =>
    apiGet<Message[]>('/messages/sent', { params }),

  get: (id: string) =>
    apiGet<Message>(`/messages/${id}`),

  send: (data: {
    recipient_id: string;
    recipient_role?: 'responsavel' | 'staff' | 'administrador';
    subject?: string;
    content: string;
    message_type?: 'info' | 'reminder' | 'alert' | 'general';
    child_id?: string;
  }) =>
    apiPost<Message>('/messages', data),

  markAsRead: (id: string) =>
    apiPatch<Message>(`/messages/${id}/read`, {}),

  delete: (id: string) =>
    apiDelete(`/messages/${id}`),
};

// ============================================================================
// Monthly Reports API
// ============================================================================

export const monthlyReportsApi = {
  list: (params?: MonthlyReportsFilters) =>
    apiGet<MonthlyReport[]>('/monthly-reports', { params }),

  getByChild: (childId: string, params?: { year?: number }) =>
    apiGet<MonthlyReport[]>(`/monthly-reports/child/${childId}`, { params }),

  create: (data: {
    child_id: string;
    month: number;
    year: number;
    status?: 'draft' | 'submitted' | 'validated' | 'rejected';
    attendance_summary?: {
      total_days: number;
      present_days: number;
      absent_days: number;
      late_days: number;
    };
    physical_development?: string;
    cognitive_development?: string;
    social_development?: string;
    emotional_development?: string;
    general_notes?: string;
    achievements?: string;
    areas_for_improvement?: string;
  }) =>
    apiPost<MonthlyReport>('/monthly-reports', data),

  update: (id: string, data: Partial<Omit<MonthlyReport, 'id' | 'child_id'>>) =>
    apiPut<MonthlyReport>(`/monthly-reports/${id}`, data),

  validate: (id: string) =>
    apiPatch<MonthlyReport>(`/monthly-reports/${id}/validate`, {}),

  reject: (id: string, rejection_reason: string) =>
    apiPatch<MonthlyReport>(`/monthly-reports/${id}/reject`, { rejection_reason }),

  delete: (id: string) =>
    apiDelete(`/monthly-reports/${id}`),
};

// ============================================================================
// Users API
// ============================================================================

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface UsersFilters extends PaginationParams {
  role?: string;
  search?: string;
}

export const usersApi = {
  list: (params?: UsersFilters) =>
    apiGet<UserSummary[]>('/users', { params }),
};
