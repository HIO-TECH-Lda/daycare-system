import Child, { IChildDocument } from '../models/Child';
import mongoose from 'mongoose';

export class ChildService {
  // Create a new child
  static async create(data: {
    name: string;
    birth_date: Date | string;
    class_id: string;
    parent_id: string;
    photo_url?: string;
    allergies?: string;
    medications?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    gender?: 'Masculino' | 'Feminino';
    nationality?: string;
    address?: string;
    languages_spoken?: string;
    dietary_restrictions?: string;
    sleep_schedule?: string;
    preferred_foods?: string;
    separation_reaction?: string;
    plays_with_others?: boolean;
    behavior_notes?: string;
    previous_center?: string;
    transfer_reason?: string;
    image_usage_authorized?: boolean;
    enrollment_signature?: string;
    enrollment_date?: Date | string;
  }): Promise<IChildDocument> {
    const childData = {
      ...data,
      class_id: new mongoose.Types.ObjectId(data.class_id),
      parent_id: new mongoose.Types.ObjectId(data.parent_id),
      birth_date: typeof data.birth_date === 'string' ? new Date(data.birth_date) : data.birth_date,
      enrollment_date: data.enrollment_date ? (typeof data.enrollment_date === 'string' ? new Date(data.enrollment_date) : data.enrollment_date) : undefined
    };
    const child = await Child.create(childData);
    return child;
  }

  // Get all children (with role-based filtering)
  static async findAll(
    userRole: string,
    userId: string,
    assignedClassIds?: string[],
    page = 1,
    limit = 20
  ): Promise<{ children: IChildDocument[]; total: number }> {
    const query: any = {};

    // Responsável: only their own children
    if (userRole === 'responsavel') {
      query.parent_id = new mongoose.Types.ObjectId(userId);
    }
    // Staff: children in assigned classes only (none when unassigned)
    else if (userRole === 'staff') {
      query.class_id = { $in: (assignedClassIds || []).map(id => new mongoose.Types.ObjectId(id)) };
    }
    // Admin: all children (no filter)

    const skip = (page - 1) * limit;
    const [children, total] = await Promise.all([
      Child.find(query)
        .populate('class_id', 'name min_age_months max_age_months capacity')
        .populate('parent_id', 'firstName lastName email phone')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Child.countDocuments(query)
    ]);
    return { children, total };
  }

  // Get child by ID (with access check)
  static async findById(id: string, userRole: string, userId: string, assignedClassIds?: string[]): Promise<IChildDocument | null> {
    const child = await Child.findById(id)
      .populate('class_id', 'name min_age_months max_age_months capacity')
      .populate('parent_id', 'firstName lastName email phone');

    if (!child) {
      return null;
    }

    // Check access
    if (userRole === 'responsavel') {
      const parentId = (child.parent_id as any)?._id?.toString() ?? (child.parent_id as any).toString();
      if (parentId !== userId) {
        return null; // Not their child
      }
    } else if (userRole === 'staff') {
      // Check if child's class is in assigned classes
      if (assignedClassIds && assignedClassIds.length > 0) {
        const childClassId = (child.class_id as any)?._id?.toString() ?? (child.class_id as any).toString();
        if (!assignedClassIds.includes(childClassId)) {
          return null; // Not in assigned class
        }
      } else {
        return null; // Staff with no assignments can't see any children
      }
    }
    // Admin: can see all

    return child;
  }

  // Update child
  static async update(id: string, data: Partial<{
    name: string;
    birth_date: Date | string;
    class_id: string;
    parent_id: string;
    photo_url: string;
    allergies: string;
    medications: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    gender: 'Masculino' | 'Feminino';
    nationality: string;
    address: string;
    languages_spoken: string;
    dietary_restrictions: string;
    sleep_schedule: string;
    preferred_foods: string;
    separation_reaction: string;
    plays_with_others: boolean;
    behavior_notes: string;
    previous_center: string;
    transfer_reason: string;
    image_usage_authorized: boolean;
    enrollment_signature: string;
    enrollment_date: Date | string;
  }>): Promise<IChildDocument | null> {
    const updateData: any = { ...data };
    
    if (data.class_id) {
      updateData.class_id = new mongoose.Types.ObjectId(data.class_id);
    }
    if (data.parent_id) {
      updateData.parent_id = new mongoose.Types.ObjectId(data.parent_id);
    }
    if (data.birth_date) {
      updateData.birth_date = typeof data.birth_date === 'string' ? new Date(data.birth_date) : data.birth_date;
    }
    if (data.enrollment_date) {
      updateData.enrollment_date = typeof data.enrollment_date === 'string' ? new Date(data.enrollment_date) : data.enrollment_date;
    }

    const child = await Child.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('class_id', 'name min_age_months max_age_months capacity')
      .populate('parent_id', 'firstName lastName email phone');

    return child;
  }

  // Delete child
  static async delete(id: string): Promise<IChildDocument | null> {
    const child = await Child.findByIdAndDelete(id);
    return child;
  }
}
