import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice {
  _id?: string;
  invoice_number: string;
  child_id: mongoose.Types.ObjectId;
  parent_id: mongoose.Types.ObjectId;
  issue_date: Date;
  due_date: Date;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  items: Array<{
    description: string;
    quantity?: number;
    unit_price: number;
    total: number;
  }>;
  notes?: string;
  created_by: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvoiceDocument extends Omit<IInvoice, '_id'>, Document {}

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    invoice_number: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true
    },
    child_id: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required']
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent ID is required']
    },
    issue_date: {
      type: Date,
      required: [true, 'Issue date is required'],
      default: Date.now
    },
    due_date: {
      type: Date,
      required: [true, 'Due date is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending'
    },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, default: 1 },
      unit_price: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 }
    }],
    notes: {
      type: String,
      default: ''
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required']
    }
  },
  { timestamps: true }
);

invoiceSchema.index({ child_id: 1 });
invoiceSchema.index({ parent_id: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ due_date: -1 });

export default mongoose.model<IInvoiceDocument>('Invoice', invoiceSchema);
