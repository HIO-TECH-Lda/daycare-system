import Expense, { IExpenseDocument } from '../models/Expense';
import mongoose from 'mongoose';

export class ExpenseService {
  static async create(data: {
    category_id: string;
    amount: number;
    description: string;
    expense_date?: Date | string;
    receipt_url?: string;
    vendor?: string;
    recorded_by: string;
  }): Promise<IExpenseDocument> {
    const expenseData: any = {
      ...data,
      category_id: new mongoose.Types.ObjectId(data.category_id),
      recorded_by: new mongoose.Types.ObjectId(data.recorded_by)
    };
    if (data.expense_date) {
      expenseData.expense_date = typeof data.expense_date === 'string' ? new Date(data.expense_date) : data.expense_date;
    }
    const expense = await Expense.create(expenseData);
    return await expense.populate('category_id', 'name')
      .populate('recorded_by', 'firstName lastName');
  }

  static async findAll(categoryId?: string, startDate?: Date, endDate?: Date, page = 1, limit = 20): Promise<{ expenses: IExpenseDocument[]; total: number }> {
    const query: any = {};
    if (categoryId) query.category_id = new mongoose.Types.ObjectId(categoryId);
    if (startDate || endDate) {
      query.expense_date = {};
      if (startDate) query.expense_date.$gte = startDate;
      if (endDate) query.expense_date.$lte = endDate;
    }
    const skip = (page - 1) * limit;
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('category_id', 'name')
        .populate('recorded_by', 'firstName lastName')
        .sort({ expense_date: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(query)
    ]);
    return { expenses, total };
  }

  static async findById(id: string): Promise<IExpenseDocument | null> {
    return await Expense.findById(id)
      .populate('category_id', 'name description')
      .populate('recorded_by', 'firstName lastName');
  }

  static async update(id: string, data: Partial<any>): Promise<IExpenseDocument | null> {
    const updateData: any = { ...data };
    if (data.category_id) {
      updateData.category_id = new mongoose.Types.ObjectId(data.category_id);
    }
    if (data.expense_date && typeof data.expense_date === 'string') {
      updateData.expense_date = new Date(data.expense_date);
    }
    return await Expense.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('category_id', 'name')
      .populate('recorded_by', 'firstName lastName');
  }

  static async delete(id: string): Promise<IExpenseDocument | null> {
    return await Expense.findByIdAndDelete(id);
  }
}
