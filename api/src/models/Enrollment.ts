import mongoose, { Document, Schema } from 'mongoose';
import { normalisePhone } from '../utils/phone';

/**
 * An enrolment request: filled in by a family on the public form (/matricula) or by an admin
 * on a family's behalf. Nothing is created until an admin approves it; approval creates the
 * child, guardians and pickup persons, and the parent account (or links an existing one).
 */
export type EnrollmentStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface IEnrollmentGuardian {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  profession?: string;
  workplace?: string;
  address?: string;
}

export interface IEnrollmentPickupPerson {
  name: string;
  relationship?: string;
  phone: string;
  id_document?: string;
}

export interface IEnrollment {
  reference: string;
  status: EnrollmentStatus;
  source: 'public' | 'admin';
  submitted_by?: mongoose.Types.ObjectId;
  child: {
    name: string;
    birth_date: Date;
    gender?: 'Masculino' | 'Feminino';
    nationality?: string;
    address?: string;
    languages_spoken?: string;
    allergies?: string;
    medications?: string;
    dietary_restrictions?: string;
    sleep_schedule?: string;
    preferred_foods?: string;
    separation_reaction?: string;
    plays_with_others?: boolean;
    behavior_notes?: string;
    previous_center?: string;
    transfer_reason?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
  /** The first guardian is the main contact and gets the parent account */
  guardians: IEnrollmentGuardian[];
  pickup_persons: IEnrollmentPickupPerson[];
  consents: {
    data_processing: boolean;
    image_usage_authorized: boolean;
    whatsapp_opt_in: boolean;
  };
  requested_class_id?: mongoose.Types.ObjectId;
  requested_start_date?: Date;
  notes?: string;
  /** Full name typed by the guardian as signature */
  signature?: string;
  reviewed_by?: mongoose.Types.ObjectId;
  reviewed_at?: Date;
  rejection_reason?: string;
  assigned_class_id?: mongoose.Types.ObjectId;
  child_id?: mongoose.Types.ObjectId;
  parent_user_id?: mongoose.Types.ObjectId;
}

export interface IEnrollmentDocument extends IEnrollment, Document {}

const phoneField = {
  type: String,
  set: (value: unknown) => (typeof value === 'string' && value.trim() ? normalisePhone(value) ?? value.trim() : undefined)
};

const guardianSchema = new Schema<IEnrollmentGuardian>({
  name: { type: String, required: true, trim: true },
  relationship: String,
  phone: phoneField,
  email: { type: String, lowercase: true, trim: true },
  profession: String,
  workplace: String,
  address: String
}, { _id: false });

const pickupPersonSchema = new Schema<IEnrollmentPickupPerson>({
  name: { type: String, required: true, trim: true },
  relationship: String,
  phone: { ...phoneField, required: true },
  id_document: String
}, { _id: false });

const enrollmentSchema = new Schema<IEnrollmentDocument>(
  {
    reference: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected'],
      default: 'submitted'
    },
    source: { type: String, enum: ['public', 'admin'], required: true },
    submitted_by: { type: Schema.Types.ObjectId, ref: 'User' },
    child: {
      name: { type: String, required: true, trim: true },
      birth_date: { type: Date, required: true },
      gender: { type: String, enum: ['Masculino', 'Feminino'] },
      nationality: String,
      address: String,
      languages_spoken: String,
      allergies: String,
      medications: String,
      dietary_restrictions: String,
      sleep_schedule: String,
      preferred_foods: String,
      separation_reaction: String,
      plays_with_others: Boolean,
      behavior_notes: String,
      previous_center: String,
      transfer_reason: String,
      emergency_contact_name: String,
      emergency_contact_phone: String
    },
    guardians: {
      type: [guardianSchema],
      validate: { validator: (list: unknown[]) => list.length > 0, message: 'Indique pelo menos um encarregado' }
    },
    pickup_persons: { type: [pickupPersonSchema], default: [] },
    consents: {
      data_processing: { type: Boolean, required: true },
      image_usage_authorized: { type: Boolean, default: false },
      whatsapp_opt_in: { type: Boolean, default: false }
    },
    requested_class_id: { type: Schema.Types.ObjectId, ref: 'Class' },
    requested_start_date: Date,
    notes: String,
    signature: String,
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewed_at: Date,
    rejection_reason: String,
    assigned_class_id: { type: Schema.Types.ObjectId, ref: 'Class' },
    child_id: { type: Schema.Types.ObjectId, ref: 'Child' },
    parent_user_id: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

enrollmentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IEnrollmentDocument>('Enrollment', enrollmentSchema);
