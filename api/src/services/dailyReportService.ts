import DailyReport, { IDailyReportDocument } from '../models/DailyReport';
import { writeDayRecord, SyncResult } from '../utils/syncWrite';
import mongoose, { FilterQuery } from 'mongoose';

export class DailyReportService {
  /** Create or update the child's report for that day (offline-safe, see utils/syncWrite). */
  static async record(
    childId: string,
    date: Date | string,
    fields: Record<string, unknown> & { created_by: string },
    clientId?: string
  ): Promise<SyncResult<IDailyReportDocument>> {
    const result = await writeDayRecord(DailyReport, childId, date, fields, clientId);
    await result.doc.populate([
      { path: 'child_id', select: 'name birth_date' },
      { path: 'created_by', select: 'firstName lastName' }
    ]);
    return result;
  }

  static async findByChildId(childId: string, startDate?: Date, endDate?: Date): Promise<IDailyReportDocument[]> {
    const query: any = { child_id: new mongoose.Types.ObjectId(childId) };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    return await DailyReport.find(query)
      .populate('child_id', 'name birth_date')
      .populate('created_by', 'firstName lastName')
      .sort({ date: -1 });
  }

  static async findById(id: string): Promise<IDailyReportDocument | null> {
    return await DailyReport.findById(id)
      .populate('child_id', 'name birth_date parent_id')
      .populate('created_by', 'firstName lastName');
  }

  static async update(id: string, data: Partial<any>): Promise<IDailyReportDocument | null> {
    return await DailyReport.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    })
      .populate('child_id', 'name birth_date')
      .populate('created_by', 'firstName lastName');
  }

  static async delete(id: string): Promise<IDailyReportDocument | null> {
    return await DailyReport.findByIdAndDelete(id);
  }

  static async findAll(childId?: string, startDate?: Date, endDate?: Date, page = 1, limit = 20): Promise<{ reports: IDailyReportDocument[]; total: number }> {
    const query: any = {};
    if (childId) query.child_id = new mongoose.Types.ObjectId(childId);
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      DailyReport.find(query)
        .populate('child_id', 'name birth_date')
        .populate('created_by', 'firstName lastName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      DailyReport.countDocuments(query)
    ]);
    return { reports, total };
  }

  static async findAllScoped(
    role: string,
    userId: string,
    childId?: string,
    startDate?: Date,
    endDate?: Date,
    page = 1,
    limit = 20
  ): Promise<{ reports: IDailyReportDocument[]; total: number }> {
    const query: FilterQuery<IDailyReportDocument> = {};

    if (childId) {
      query.child_id = new mongoose.Types.ObjectId(childId);
    } else if (role === 'responsavel') {
      const Child = (await import('../models/Child')).default;
      const children = await Child.find({ parent_id: new mongoose.Types.ObjectId(userId) }).select('_id');
      query.child_id = { $in: children.map((c) => c._id) };
    } else if (role === 'staff') {
      const StaffAssignment = (await import('../models/StaffAssignment')).default;
      const Child = (await import('../models/Child')).default;
      const assignments = await StaffAssignment.find({ staff_id: new mongoose.Types.ObjectId(userId) }).select('class_id');
      const classIds = assignments.map((a) => a.class_id);
      const children = await Child.find({ class_id: { $in: classIds } }).select('_id');
      query.child_id = { $in: children.map((c) => c._id) };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) (query.date as any).$gte = startDate;
      if (endDate) (query.date as any).$lte = endDate;
    }

    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      DailyReport.find(query)
        .populate('child_id', 'name birth_date')
        .populate('created_by', 'firstName lastName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      DailyReport.countDocuments(query)
    ]);
    return { reports, total };
  }
}
