/**
 * Domain types for the daycare web app.
 * Backend is the API (../api) — MongoDB + JWT auth.
 */

export type UserRole = 'responsavel' | 'staff' | 'administrador';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
}

export interface Class {
  id: string;
  name: string;
  min_age_months: number;
  max_age_months: number;
  capacity: number;
}

export interface Child {
  id: string;
  name: string;
  birth_date: string;
  class_id: string;
  parent_id: string;
  photo_url: string;
  allergies: string;
  medications: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  gender?: 'Masculino' | 'Feminino';
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
}

export interface Guardian {
  id: string;
  child_id: string;
  name: string;
  profession?: string;
  workplace?: string;
  phone?: string;
  email?: string;
  guardian_type: 1 | 2;
}

export interface AuthorizedPickupPerson {
  id: string;
  child_id: string;
  name: string;
  kinship_degree?: string;
}

export interface EnrollmentDocument {
  id: string;
  child_id: string;
  document_type: 'birth_certificate' | 'guardian_id' | 'proof_of_residence' | 'child_photo' | 'vaccination_record';
  status: 'pending' | 'verified';
  file_url?: string;
}

export interface MonthlyReport {
  id: string;
  child_id: string;
  report_month: number;
  report_year: number;
  physical_development?: string;
  cognitive_development?: string;
  social_development?: string;
  emotional_development?: string;
  general_notes?: string;
  achievements?: string;
  areas_for_improvement?: string;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  created_by: string;
  validated_by?: string;
  validated_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyReport {
  id: string;
  child_id: string;
  report_date: string;
  mood: string;
  summary_note: string;
  created_by: string;
}

export interface Activity {
  id: string;
  daily_report_id: string;
  activity_type: 'nap' | 'feeding' | 'diaper' | 'pedagogical';
  time: string;
  duration_minutes?: number;
  food_item?: string;
  amount?: string;
  diaper_condition?: string;
  description?: string;
}

export interface ReportPhoto {
  id: string;
  daily_report_id: string;
  photo_url: string;
}

export interface Attendance {
  id: string;
  child_id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  brought_by?: string;
  picked_up_by?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_type: string;
  class_id?: string;
}

export interface Invoice {
  id: string;
  parent_id: string;
  child_id: string;
  amount: number;
  due_date: string;
  issue_date: string;
  status: 'pendente' | 'pago';
  paid_amount?: number;
  last_payment_date?: string;
}

export interface Payment {
  id: string;
  invoice_id?: string;
  parent_id: string;
  child_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Expense {
  id: string;
  category_id: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  supplier_name?: string;
  notes?: string;
  receipt_url?: string;
  recorded_by: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
}
