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
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  guardian_type: 1 | 2; // 1 = primary, 2 = secondary
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
  month: number; // 1-12
  year: number;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  validated_by?: string;
  validated_at?: string;
  rejection_reason?: string;
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
}

export interface DailyReport {
  id: string;
  child_id: string;
  date: string; // ISO date
  created_by: string;
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
}

export interface Activity {
  id: string;
  name: string;
  description?: string;
  class_id?: string;
  age_group?: string;
  duration_minutes?: number;
  materials_needed?: string[];
  learning_objectives?: string[];
  is_active?: boolean;
}

export interface ReportPhoto {
  id: string;
  daily_report_id: string;
  photo_url: string;
  caption?: string;
}

export interface Attendance {
  id: string;
  child_id: string;
  date: string; // ISO date
  check_in?: string; // ISO datetime
  check_out?: string; // ISO datetime
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string; // ISO datetime
  end_date: string; // ISO datetime
  is_all_day?: boolean;
  event_type: 'activity' | 'holiday' | 'meeting' | 'other';
  class_id?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  child_id: string;
  parent_id: string;
  issue_date: string; // ISO date
  due_date: string; // ISO date
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  items: Array<{
    description: string;
    quantity?: number;
    unit_price: number;
    total: number;
  }>;
  notes?: string;
}

export interface Payment {
  id: string;
  invoice_id?: string;
  parent_id: string;
  child_id: string;
  amount: number;
  payment_date: string; // ISO date
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  notes?: string;
}

export interface StaffAssignment {
  id: string;
  staff_id: string;
  class_id: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface Expense {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  expense_date: string; // ISO date
  receipt_url?: string;
  vendor?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  recipient_role?: 'responsavel' | 'staff' | 'administrador';
  subject?: string;
  content: string;
  message_type?: 'info' | 'reminder' | 'alert' | 'general';
  child_id?: string;
  is_read: boolean;
  created_at: string;
}
