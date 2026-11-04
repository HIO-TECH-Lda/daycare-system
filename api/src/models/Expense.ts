import mongoose, { Document, Schema } from 'mongoose';
import { mediaJsonTransform } from '../utils/media';

export interface IExpense {
  _id?: string;
  category_id: mongoose.Types.ObjectId;
  amount: number;
  description: string;
  expense_date: Date;
  receipt_url?: string;
  vendor?: string;
  recorded_by: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IExpenseDocument extends Omit<IExpense, '_id'>, Document {}

const expenseSchema = new Schema<IExpenseDocument>(
  {
    category_id: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: [true, 'Category ID is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    expense_date: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now
    },
    receipt_url: {
      type: String,
      default: ''
    },
    vendor: {
      type: String,
      trim: true,
      default: ''
    },
    recorded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by is required']
    }
  },
  // The stored file URL is private: responses carry a signed media link instead
  { timestamps: true, toJSON: { transform: mediaJsonTransform('receipts', 'receipt_url') } }
);

expenseSchema.index({ category_id: 1 });
expenseSchema.index({ expense_date: -1 });
expenseSchema.index({ recorded_by: 1 });

export default mongoose.model<IExpenseDocument>('Expense', expenseSchema);
