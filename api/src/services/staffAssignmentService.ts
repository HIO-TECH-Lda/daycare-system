import StaffAssignment, { IStaffAssignmentDocument } from '../models/StaffAssignment';
import mongoose from 'mongoose';

export class StaffAssignmentService {
  // Get assigned class IDs for a staff user
  static async getAssignedClassIds(staffId: string): Promise<string[]> {
    const assignments = await StaffAssignment.find({ staff_id: new mongoose.Types.ObjectId(staffId) })
      .select('class_id')
      .lean();
    return assignments.map(a => a.class_id.toString());
  }

  // Create assignment
  static async create(staff_id: string, class_id: string): Promise<IStaffAssignmentDocument> {
    const assignment = await StaffAssignment.create({
      staff_id: new mongoose.Types.ObjectId(staff_id),
      class_id: new mongoose.Types.ObjectId(class_id)
    });
    return assignment;
  }

  // Get all assignments (optionally filter by staff_id)
  static async findAll(staffId?: string, page = 1, limit = 20): Promise<{ assignments: IStaffAssignmentDocument[]; total: number }> {
    const query = staffId ? { staff_id: new mongoose.Types.ObjectId(staffId) } : {};
    const skip = (page - 1) * limit;
    const [assignments, total] = await Promise.all([
      StaffAssignment.find(query)
        .populate('staff_id', 'firstName lastName email role')
        .populate('class_id', 'name min_age_months max_age_months capacity')
        .sort({ staff_id: 1, class_id: 1 })
        .skip(skip)
        .limit(limit),
      StaffAssignment.countDocuments(query)
    ]);
    return { assignments, total };
  }

  // Get assignment by ID
  static async findById(id: string): Promise<IStaffAssignmentDocument | null> {
    return await StaffAssignment.findById(id)
      .populate('staff_id', 'firstName lastName email role')
      .populate('class_id', 'name min_age_months max_age_months capacity');
  }

  // Delete assignment
  static async delete(id: string): Promise<IStaffAssignmentDocument | null> {
    return await StaffAssignment.findByIdAndDelete(id);
  }

  // Delete all assignments for a staff user (optional helper)
  static async deleteByStaffId(staffId: string): Promise<{ deletedCount: number }> {
    const result = await StaffAssignment.deleteMany({ staff_id: new mongoose.Types.ObjectId(staffId) });
    return { deletedCount: result.deletedCount || 0 };
  }
}
