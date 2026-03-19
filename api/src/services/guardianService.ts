import Guardian, { IGuardianDocument } from '../models/Guardian';
import mongoose from 'mongoose';

export class GuardianService {
  // Create a new guardian
  static async create(data: {
    child_id: string;
    name: string;
    profession?: string;
    workplace?: string;
    relationship?: string;
    phone?: string;
    email?: string;
    address?: string;
    guardian_type: 1 | 2;
  }): Promise<IGuardianDocument> {
    const guardianData = {
      ...data,
      child_id: new mongoose.Types.ObjectId(data.child_id)
    };
    const guardian = await Guardian.create(guardianData);
    await guardian.populate({ path: 'child_id', select: 'name birth_date' });
    return guardian;
  }

  // Get all guardians for a child
  static async findByChildId(childId: string): Promise<IGuardianDocument[]> {
    return await Guardian.find({ child_id: new mongoose.Types.ObjectId(childId) })
      .populate('child_id', 'name birth_date')
      .sort({ guardian_type: 1, name: 1 });
  }

  // Get guardian by ID
  static async findById(id: string): Promise<IGuardianDocument | null> {
    return await Guardian.findById(id)
      .populate('child_id', 'name birth_date parent_id');
  }

  // Update guardian
  static async update(id: string, data: Partial<{
    name: string;
    profession: string;
    workplace: string;
    relationship: string;
    phone: string;
    email: string;
    address: string;
    guardian_type: 1 | 2;
  }>): Promise<IGuardianDocument | null> {
    const guardian = await Guardian.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    })
      .populate('child_id', 'name birth_date');
    return guardian;
  }

  // Delete guardian
  static async delete(id: string): Promise<IGuardianDocument | null> {
    const guardian = await Guardian.findByIdAndDelete(id);
    return guardian;
  }

  // Get all guardians (with optional child filter)
  static async findAll(childId?: string, page = 1, limit = 20): Promise<{ guardians: IGuardianDocument[]; total: number }> {
    const query = childId ? { child_id: new mongoose.Types.ObjectId(childId) } : {};
    const skip = (page - 1) * limit;
    const [guardians, total] = await Promise.all([
      Guardian.find(query)
        .populate('child_id', 'name birth_date')
        .sort({ is_primary: -1, name: 1 })
        .skip(skip)
        .limit(limit),
      Guardian.countDocuments(query)
    ]);
    return { guardians, total };
  }
}
