import mongoose, { Document, Schema } from 'mongoose';

/**
 * "Já paguei": a parent says they paid an invoice (M-Pesa, e-Mola, bank transfer or cash) and gives
 * the transaction reference. The administration checks it against the account and confirms it
 * (which records the payment) or rejects it with a reason. Online payments are out of scope for v1.
 */
export type ClaimMethod = 'mpesa' | 'emola' | 'bank_transfer' | 'cash';
export type ClaimStatus = 'pending' | 'confirmed' | 'rejected';

export interface IPaymentClaim {
  invoice_id: mongoose.Types.ObjectId;
  parent_id: mongoose.Types.ObjectId;
  child_id: mongoose.Types.ObjectId;
  amount: number;
  method: ClaimMethod;
  reference?: string;
  paid_on: Date;
  notes?: string;
  status: ClaimStatus;
  reviewed_by?: mongoose.Types.ObjectId;
  reviewed_at?: Date;
  rejection_reason?: string;
  /** The payment recorded when the claim was confirmed */
  payment_id?: mongoose.Types.ObjectId;
}

export interface IPaymentClaimDocument extends IPaymentClaim, Document {}

const paymentClaimSchema = new Schema<IPaymentClaimDocument>(
  {
    invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    child_id: { type: Schema.Types.ObjectId, ref: 'Child', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['mpesa', 'emola', 'bank_transfer', 'cash'], required: true },
    reference: { type: String, trim: true, default: '' },
    paid_on: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    rejection_reason: { type: String, trim: true, default: '' },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null }
  },
  { timestamps: true }
);

paymentClaimSchema.index({ status: 1, createdAt: 1 });
paymentClaimSchema.index({ parent_id: 1, createdAt: -1 });
paymentClaimSchema.index({ invoice_id: 1, status: 1 });

export default mongoose.model<IPaymentClaimDocument>('PaymentClaim', paymentClaimSchema);
