import MonthlyReport, { IMonthlyReportDocument } from '../models/MonthlyReport';
import mongoose, { FilterQuery } from 'mongoose';

export class MonthlyReportService {
  static async create(data: {
    child_id: string;
    month: number;
    year: number;
    created_by: string;
    attendance_summary?: any;
    development_notes?: string;
    behavior_summary?: string;
    activities_participated?: string[];
    recommendations?: string;
    parent_feedback?: string;
  }): Promise<IMonthlyReportDocument> {
    const reportData = {
      ...data,
      child_id: new mongoose.Types.ObjectId(data.child_id),
      created_by: new mongoose.Types.ObjectId(data.created_by)
    };
    const report = await MonthlyReport.create(reportData);
    await report.populate([
      { path: 'child_id', select: 'name birth_date' },
      { path: 'created_by', select: 'firstName lastName' }
    ]);
    return report;
  }

  static async findByChildId(childId: string, year?: number, page = 1, limit = 20, scope: Record<string, unknown> = {}): Promise<{ reports: IMonthlyReportDocument[]; total: number }> {
    const query: any = { ...scope, child_id: new mongoose.Types.ObjectId(childId) };
    if (year) query.year = year;
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      MonthlyReport.find(query)
        .populate('child_id', 'name birth_date')
        .populate('created_by', 'firstName lastName')
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limit),
      MonthlyReport.countDocuments(query)
    ]);
    return { reports, total };
  }

  static async findById(id: string): Promise<IMonthlyReportDocument | null> {
    return await MonthlyReport.findById(id)
      .populate('child_id', 'name birth_date parent_id')
      .populate('created_by', 'firstName lastName');
  }

  static async findByMonthYear(month: number, year: number, page = 1, limit = 20, scope: Record<string, unknown> = {}): Promise<{ reports: IMonthlyReportDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      MonthlyReport.find({ month, year, ...scope })
        .populate('child_id', 'name birth_date')
        .populate('created_by', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MonthlyReport.countDocuments({ month, year, ...scope })
    ]);
    return { reports, total };
  }

  static async update(id: string, data: Partial<any>): Promise<IMonthlyReportDocument | null> {
    return await MonthlyReport.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    })
      .populate('child_id', 'name birth_date')
      .populate('created_by', 'firstName lastName');
  }

  static async delete(id: string): Promise<IMonthlyReportDocument | null> {
    return await MonthlyReport.findByIdAndDelete(id);
  }

  // `scope` limits the query to the children (and, for parents, the statuses) the user may see
  static async findAll(scope: Record<string, unknown> = {}, page = 1, limit = 20): Promise<{ reports: IMonthlyReportDocument[]; total: number }> {
    const query: FilterQuery<IMonthlyReportDocument> = { ...scope };
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      MonthlyReport.find(query)
        .populate('child_id', 'name birth_date')
        .populate('created_by', 'firstName lastName')
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limit),
      MonthlyReport.countDocuments(query)
    ]);
    return { reports, total };
  }

  static async validate(id: string, validatedByUserId: string): Promise<IMonthlyReportDocument | null> {
    return await MonthlyReport.findByIdAndUpdate(
      id,
      {
        status: 'validated',
        validated_by: new mongoose.Types.ObjectId(validatedByUserId),
        validated_at: new Date()
      },
      { new: true }
    )
      .populate('child_id', 'name birth_date')
      .populate('created_by', 'firstName lastName')
      .populate('validated_by', 'firstName lastName');
  }

  static async reject(id: string, rejectionReason: string): Promise<IMonthlyReportDocument | null> {
    return await MonthlyReport.findByIdAndUpdate(
      id,
      { status: 'rejected', rejection_reason: rejectionReason },
      { new: true }
    )
      .populate('child_id', 'name birth_date')
      .populate('created_by', 'firstName lastName');
  }
}
