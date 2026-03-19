import mongoose, { Document, Schema } from 'mongoose';

export interface IChild {
  _id?: string;
  name: string;
  birth_date: Date;
  class_id: mongoose.Types.ObjectId;
  parent_id: mongoose.Types.ObjectId;
  photo_url?: string;
  allergies?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
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
  enrollment_date?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChildDocument extends Omit<IChild, '_id'>, Document {}

const childSchema = new Schema<IChildDocument>(
  {
    name: {
      type: String,
      required: [true, 'Child name is required'],
      trim: true
    },
    birth_date: {
      type: Date,
      required: [true, 'Birth date is required']
    },
    class_id: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required']
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent is required']
    },
    photo_url: {
      type: String,
      default: ''
    },
    allergies: {
      type: String,
      default: ''
    },
    medications: {
      type: String,
      default: ''
    },
    emergency_contact_name: {
      type: String,
      default: ''
    },
    emergency_contact_phone: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      enum: ['Masculino', 'Feminino'],
      required: false
    },
    nationality: String,
    address: String,
    languages_spoken: String,
    dietary_restrictions: String,
    sleep_schedule: String,
    preferred_foods: String,
    separation_reaction: String,
    plays_with_others: Boolean,
    behavior_notes: String,
    previous_center: String,
    transfer_reason: String,
    image_usage_authorized: {
      type: Boolean,
      default: false
    },
    enrollment_signature: String,
    enrollment_date: Date
  },
  { timestamps: true }
);

childSchema.index({ parent_id: 1 });
childSchema.index({ class_id: 1 });
childSchema.index({ name: 1 });

export default mongoose.model<IChildDocument>('Child', childSchema);
