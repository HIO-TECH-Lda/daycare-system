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
