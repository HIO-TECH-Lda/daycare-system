import mongoose, { Document, Schema } from 'mongoose';

export interface IExpenseCategory {
  _id?: string;
  name: string;
  description?: string;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IExpenseCategoryDocument extends Omit<IExpenseCategory, '_id'>, Document {}

const expenseCategorySchema = new Schema<IExpenseCategoryDocument>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

expenseCategorySchema.index({ is_active: 1 });

export default mongoose.model<IExpenseCategoryDocument>('ExpenseCategory', expenseCategorySchema);
