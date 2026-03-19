import mongoose, { Document, Schema } from 'mongoose';

export interface IGuardian {
  _id?: string;
  child_id: mongoose.Types.ObjectId;
  name: string;
  profession?: string;
  workplace?: string;
  relationship?: string; // e.g., "Pai", "Mãe", "Avô", "Avó", "Tio", "Tia"
  phone?: string;
  email?: string;
  address?: string;
  guardian_type: 1 | 2; // 1 = primary, 2 = secondary
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGuardianDocument extends Omit<IGuardian, '_id'>, Document {}

const guardianSchema = new Schema<IGuardianDocument>(
  {
    child_id: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required']
    },
    name: {
      type: String,
      required: [true, 'Guardian name is required'],
      trim: true
    },
    profession: {
      type: String,
      trim: true,
      default: ''
    },
    workplace: {
      type: String,
      trim: true,
      default: ''
    },
    relationship: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    guardian_type: {
      type: Number,
      enum: [1, 2],
      required: [true, 'Guardian type is required (1 = primary, 2 = secondary)'],
      default: 2
    }
  },
  { timestamps: true }
);

guardianSchema.index({ child_id: 1 });
guardianSchema.index({ child_id: 1, guardian_type: 1 });

export default mongoose.model<IGuardianDocument>('Guardian', guardianSchema);
