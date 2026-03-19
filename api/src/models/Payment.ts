import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment {
  _id?: string;
  invoice_id?: mongoose.Types.ObjectId; // Optional - payment can be standalone
  parent_id: mongoose.Types.ObjectId;
  child_id: mongoose.Types.ObjectId;
  amount: number;
  payment_date: Date;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  notes?: string;
  recorded_by: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentDocument extends Omit<IPayment, '_id'>, Document {}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    invoice_id: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent ID is required']
    },
    child_id: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0
    },
    payment_date: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now
    },
    payment_method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'check', 'mobile_money', 'other'],
      required: [true, 'Payment method is required']
    },
    payment_method_details: {
      type: String,
      trim: true,
      default: ''
    },
    reference_number: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    recorded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by is required']
    }
  },
  { timestamps: true }
);

paymentSchema.index({ invoice_id: 1 });
paymentSchema.index({ parent_id: 1 });
paymentSchema.index({ child_id: 1 });
paymentSchema.index({ payment_date: -1 });
paymentSchema.index({ recorded_by: 1 });

export default mongoose.model<IPaymentDocument>('Payment', paymentSchema);
