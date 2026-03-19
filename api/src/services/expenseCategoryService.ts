import ExpenseCategory, { IExpenseCategoryDocument } from '../models/ExpenseCategory';

export class ExpenseCategoryService {
  static async create(data: {
    name: string;
    description?: string;
    is_active?: boolean;
  }): Promise<IExpenseCategoryDocument> {
    return await ExpenseCategory.create(data);
  }

  static async findAll(activeOnly?: boolean, page = 1, limit = 20): Promise<{ categories: IExpenseCategoryDocument[]; total: number }> {
    const query: any = {};
    if (activeOnly !== undefined) query.is_active = activeOnly;
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      ExpenseCategory.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      ExpenseCategory.countDocuments(query)
    ]);
    return { categories, total };
  }

  static async findById(id: string): Promise<IExpenseCategoryDocument | null> {
    return await ExpenseCategory.findById(id);
  }

  static async update(id: string, data: Partial<{
    name: string;
    description: string;
    is_active: boolean;
  }>): Promise<IExpenseCategoryDocument | null> {
    return await ExpenseCategory.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    });
  }

  static async delete(id: string): Promise<IExpenseCategoryDocument | null> {
    return await ExpenseCategory.findByIdAndDelete(id);
  }
}
