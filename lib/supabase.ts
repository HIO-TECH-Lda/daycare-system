import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  check_in_time: string;
  check_out_time?: string;
  authorized_pickup_person?: string;
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
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
}
