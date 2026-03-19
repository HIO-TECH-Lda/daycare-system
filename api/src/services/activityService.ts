import Activity, { IActivityDocument } from '../models/Activity';
import mongoose from 'mongoose';

export class ActivityService {
  static async create(data: {
    name: string;
    description?: string;
    class_id?: string;
    age_group?: string;
    duration_minutes?: number;
    materials_needed?: string[];
    learning_objectives?: string[];
    is_active?: boolean;
  }): Promise<IActivityDocument> {
    const activityData: any = { ...data };
    if (data.class_id) {
      activityData.class_id = new mongoose.Types.ObjectId(data.class_id);
    }
    const activity = await Activity.create(activityData);
    await activity.populate({ path: 'class_id', select: 'name min_age_months max_age_months' });
    return activity;
  }

  static async findAll(classId?: string, activeOnly?: boolean, page = 1, limit = 20): Promise<{ activities: IActivityDocument[]; total: number }> {
    const query: any = {};
    if (classId) query.class_id = new mongoose.Types.ObjectId(classId);
    if (activeOnly !== undefined) query.is_active = activeOnly;
    const skip = (page - 1) * limit;
    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('class_id', 'name min_age_months max_age_months')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Activity.countDocuments(query)
    ]);
    return { activities, total };
  }

  static async findById(id: string): Promise<IActivityDocument | null> {
    return await Activity.findById(id)
      .populate('class_id', 'name min_age_months max_age_months');
  }

  static async update(id: string, data: Partial<any>): Promise<IActivityDocument | null> {
    const updateData: any = { ...data };
    if (data.class_id) {
      updateData.class_id = new mongoose.Types.ObjectId(data.class_id);
    }
    return await Activity.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('class_id', 'name min_age_months max_age_months');
  }

  static async delete(id: string): Promise<IActivityDocument | null> {
    return await Activity.findByIdAndDelete(id);
  }
}
