import Class, { IClassDocument } from '../models/Class';

export class ClassService {
  // Create a new class
  static async create(data: {
    name: string;
    min_age_months: number;
    max_age_months: number;
    capacity: number;
  }): Promise<IClassDocument> {
    const classDoc = await Class.create(data);
    return classDoc;
  }

  // Get all classes
  static async findAll(page = 1, limit = 20): Promise<{ classes: IClassDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [classes, total] = await Promise.all([
      Class.find().sort({ min_age_months: 1 }).skip(skip).limit(limit),
      Class.countDocuments()
    ]);
    return { classes, total };
  }

  // Get class by ID
  static async findById(id: string): Promise<IClassDocument | null> {
    return await Class.findById(id);
  }

  // Update class
  static async update(id: string, data: Partial<{
    name: string;
    min_age_months: number;
    max_age_months: number;
    capacity: number;
  }>): Promise<IClassDocument | null> {
    const classDoc = await Class.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    });
    return classDoc;
  }

  // Delete class
  static async delete(id: string): Promise<IClassDocument | null> {
    const classDoc = await Class.findByIdAndDelete(id);
    return classDoc;
  }
}
