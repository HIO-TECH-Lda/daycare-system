import mongoose, { Document, Schema } from 'mongoose';

export interface IPickupPerson {
  _id?: string;
  child_id: mongoose.Types.ObjectId;
  name: string;
  relationship?: string;
  phone: string;
  email?: string;
  id_document?: string; // CPF, ID number, etc.
  photo_url?: string;
  is_authorized: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPickupPersonDocument extends Omit<IPickupPerson, '_id'>, Document {}

const pickupPersonSchema = new Schema<IPickupPersonDocument>(
  {
    child_id: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required']
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    relationship: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    id_document: {
      type: String,
      trim: true,
      default: ''
    },
    photo_url: {
      type: String,
      default: ''
    },
    is_authorized: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

pickupPersonSchema.index({ child_id: 1 });
pickupPersonSchema.index({ child_id: 1, is_authorized: 1 });

export default mongoose.model<IPickupPersonDocument>('PickupPerson', pickupPersonSchema);
