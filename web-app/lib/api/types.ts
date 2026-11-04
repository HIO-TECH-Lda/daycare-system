/**
 * Records as the API returns them (snake_case, Mongo `_id`). Referenced records come either
 * populated (an object) or as a bare id, depending on the endpoint: use `refId()` to read the id.
 */

export type Id = string;

export type Ref<T> = T | Id | null;

export function refId(ref: Ref<{ _id: Id }> | undefined): Id | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref._id;
}

export interface PersonRef {
  _id: Id;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export function personName(person: Ref<PersonRef> | undefined): string {
  if (!person || typeof person === 'string') return '';
  return person.fullName || `${person.firstName} ${person.lastName}`.trim();
}

export interface ClassInfo {
  _id: Id;
  name: string;
  min_age_months?: number;
  max_age_months?: number;
  capacity?: number;
}

export interface StaffAssignment {
  _id: Id;
  staff_id: Ref<PersonRef>;
  class_id: Ref<ClassInfo>;
}

export interface Child {
  _id: Id;
  name: string;
  birth_date: string;
  class_id: Ref<ClassInfo>;
  parent_id: Ref<PersonRef>;
  /** Signed, short-lived link (or empty) */
  photo_url?: string;
  allergies?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  gender?: string;
  image_usage_authorized?: boolean;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  _id: Id;
  child_id: Ref<{ _id: Id; name: string }>;
  /** The centre day, as midnight UTC */
  date: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  notes?: string;
  updatedAt: string;
}

export interface Meals {
  breakfast?: string;
  lunch?: string;
  snack?: string;
  dinner?: string;
}

export interface DailyReport {
  _id: Id;
  child_id: Ref<{ _id: Id; name: string }>;
  date: string;
  meals?: Meals;
  nap_time?: { start?: string; end?: string; duration_minutes?: number };
  activities?: string[];
  mood?: string;
  notes?: string;
  behavior_notes?: string;
  health_notes?: string;
  updatedAt: string;
}

export interface ReportPhoto {
  _id: Id;
  daily_report_id: Id;
  photo_url: string;
  caption?: string;
}

export interface PickupPerson {
  _id: Id;
  child_id: Ref<{ _id: Id; name: string }>;
  name: string;
  relationship?: string;
  phone?: string;
  /** Signed, short-lived link (or empty) */
  photo_url?: string;
  is_authorized: boolean;
  /** Set for a parent's one-day authorisation (that centre day); null = permanent */
  valid_on?: string | null;
}

export interface Activity {
  _id: Id;
  name: string;
  class_id?: Ref<ClassInfo>;
  is_active?: boolean;
}

/** Free-text health fields: "Nenhuma", "não", "-" and empty all mean nothing to flag. */
export function hasHealthNote(text: string | undefined): boolean {
  const value = (text ?? '').trim().toLowerCase();
  return value !== '' && !['nenhuma', 'nenhum', 'não', 'nao', 'n/a', '-', 'sem alergias', 'nada'].includes(value);
}

export interface MonthlyReport {
  _id: Id;
  rejection_reason?: string;
  development_notes?: string;
  behavior_summary?: string;
  child_id: Ref<{ _id: Id; name: string }>;
  month: number;
  year: number;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  attendance_summary?: { total_days?: number; present_days?: number; absent_days?: number; late_days?: number };
  physical_development?: string;
  cognitive_development?: string;
  social_development?: string;
  emotional_development?: string;
  achievements?: string;
  areas_for_improvement?: string;
  general_notes?: string;
  recommendations?: string;
  created_by?: Ref<PersonRef>;
  validated_at?: string;
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  _id: Id;
  invoice_number: string;
  child_id: Ref<{ _id: Id; name: string }>;
  parent_id: Ref<PersonRef>;
  issue_date: string;
  due_date: string;
  amount: number;
  status: InvoiceStatus;
  items: { description: string; quantity: number; unit_price: number; total: number }[];
  notes?: string;
}

export interface Payment {
  _id: Id;
  invoice_id: Ref<{ _id: Id; invoice_number: string; amount: number; status: InvoiceStatus }>;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_method_details?: string;
  reference_number?: string;
}

export type ClaimMethod = 'mpesa' | 'emola' | 'bank_transfer' | 'cash';

export interface PaymentClaim {
  _id: Id;
  invoice_id: Ref<{ _id: Id; invoice_number: string; amount: number; status: InvoiceStatus }>;
  child_id: Ref<{ _id: Id; name: string }>;
  amount: number;
  method: ClaimMethod;
  reference?: string;
  paid_on: string;
  status: 'pending' | 'confirmed' | 'rejected';
  rejection_reason?: string;
  createdAt: string;
}

export interface CalendarEvent {
  _id: Id;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_all_day?: boolean;
  event_type?: string;
  class_id?: Ref<ClassInfo>;
}

export interface Message {
  _id: Id;
  sender_id: Ref<PersonRef>;
  recipient_id: Ref<PersonRef>;
  /** A message to everyone with a role (e.g. all parents) */
  recipient_role?: string;
  subject: string;
  content: string;
  message_type?: 'info' | 'reminder' | 'alert' | 'general';
  is_read: boolean;
  child_id?: Ref<{ _id: Id; name: string }>;
  createdAt: string;
}

export interface Recipient {
  id: Id;
  name: string;
  role: 'administrador' | 'staff' | 'responsavel';
  children?: string[];
  classes?: string[];
}

export type EnrollmentStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface EnrollmentGuardian {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  profession?: string;
  workplace?: string;
}

export interface Enrollment {
  _id: Id;
  reference: string;
  status: EnrollmentStatus;
  source?: 'public' | 'admin';
  child: {
    name: string;
    birth_date: string;
    gender?: string;
    allergies?: string;
    medications?: string;
    dietary_restrictions?: string;
    languages_spoken?: string;
    previous_center?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
  guardians: EnrollmentGuardian[];
  pickup_persons?: { name: string; relationship?: string; phone: string }[];
  consents: { data_processing: boolean; image_usage_authorized?: boolean; whatsapp_opt_in?: boolean };
  requested_class_id?: Ref<ClassInfo>;
  requested_start_date?: string;
  notes?: string;
  rejection_reason?: string;
  createdAt: string;
}

/** Whether the invite reached the person: if neither, the admin shares the link by hand. */
export interface Delivery {
  email: boolean;
  whatsapp: boolean;
}

export type UserStatus = 'invited' | 'active' | 'inactive' | 'suspended';

export interface UserRow {
  id: Id;
  name: string;
  email: string;
  phone: string;
  role: 'administrador' | 'staff' | 'responsavel';
  status: UserStatus;
}

export interface AdminUser extends UserRow {
  firstName: string;
  lastName: string;
  invitedAt?: string | null;
  activatedAt?: string | null;
  whatsappOptIn: boolean;
}

export interface Guardian {
  _id: Id;
  child_id: Ref<{ _id: Id; name: string }>;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  profession?: string;
  workplace?: string;
}

export interface FinanceSummary {
  invoiced: number;
  received: number;
  expenses: number;
  net: number;
  outstanding: { amount: number; count: number; overdue_amount: number; overdue_count: number };
}

export interface AdminPaymentClaim extends PaymentClaim {
  parent_id: Ref<PersonRef>;
  notes?: string;
}

export interface ExpenseCategory {
  _id: Id;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Expense {
  _id: Id;
  category_id: Ref<{ _id: Id; name: string }>;
  amount: number;
  description: string;
  expense_date: string;
  /** Signed, short-lived link (or empty) */
  receipt_url?: string;
  vendor?: string;
}

export interface AttendanceReport {
  month: string;
  totals: { present: number; late: number; absent: number; excused: number; days: number; rate: number };
  children: { child_id: Id; name: string; class: string; present: number; late: number; absent: number; excused: number; days: number; rate: number }[];
}

export interface PaymentsReport {
  total: number;
  count: number;
  by_method: { method: string; amount: number; count: number }[];
  by_month: { month: string; amount: number; count: number }[];
}

export interface ExpensesReport {
  total: number;
  by_category: { category_id: Id; category: string; amount: number; count: number }[];
  by_month: { month: string; amount: number; count: number }[];
}

export interface FinanceReport extends FinanceSummary {
  by_month: { month: string; invoiced: number; received: number; expenses: number }[];
}
