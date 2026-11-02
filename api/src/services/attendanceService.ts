import Attendance, { IAttendanceDocument } from '../models/Attendance';
import mongoose from 'mongoose';
import { writeDayRecord, SyncResult } from '../utils/syncWrite';
import { startOfCentreDay } from '../utils/dates';

export class AttendanceService {
  /** Create or update the child's attendance for that day (offline-safe, see utils/syncWrite). */
  static async record(
    childId: string,
    date: Date | string,
    fields: { check_in?: Date | string; check_out?: Date | string; status?: string; notes?: string; recorded_by: string },
    clientId?: string
  ): Promise<SyncResult<IAttendanceDocument>> {
    const result = await writeDayRecord(Attendance, childId, date, fields, clientId);
    await result.doc.populate([
      { path: 'child_id', select: 'name birth_date' },
      { path: 'recorded_by', select: 'firstName lastName' }
    ]);
    return result;
  }

  static async findByChildId(childId: string, startDate?: Date, endDate?: Date, page = 1, limit = 20): Promise<{ attendances: IAttendanceDocument[]; total: number }> {
    const query: any = { child_id: new mongoose.Types.ObjectId(childId) };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    const skip = (page - 1) * limit;
    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .populate('child_id', 'name birth_date')
        .populate('recorded_by', 'firstName lastName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query)
    ]);
    return { attendances, total };
  }

  static async findByDate(date: Date | string, page = 1, limit = 20, scope: Record<string, unknown> = {}): Promise<{ attendances: IAttendanceDocument[]; total: number }> {
    // Records are stored as the centre's calendar day (see utils/dates)
    const start = startOfCentreDay(date);
    const dateRange = { $gte: start, $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    const skip = (page - 1) * limit;
    const [attendances, total] = await Promise.all([
      Attendance.find({ date: dateRange, ...scope })
        .populate('child_id', 'name birth_date class_id')
        .populate('recorded_by', 'firstName lastName')
        .sort({ check_in: 1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments({ date: dateRange, ...scope })
    ]);
    return { attendances, total };
  }

  static async findAll(page = 1, limit = 20, scope: Record<string, unknown> = {}): Promise<{ attendances: IAttendanceDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [attendances, total] = await Promise.all([
      Attendance.find(scope)
        .populate('child_id', 'name birth_date class_id')
        .populate('recorded_by', 'firstName lastName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(scope)
    ]);
    return { attendances, total };
  }

  static async findById(id: string): Promise<IAttendanceDocument | null> {
    return await Attendance.findById(id)
      .populate('child_id', 'name birth_date parent_id')
      .populate('recorded_by', 'firstName lastName');
  }

  static async update(id: string, data: Partial<any>): Promise<IAttendanceDocument | null> {
    const updateData: any = { ...data };
    if (data.check_in && typeof data.check_in === 'string') {
      updateData.check_in = new Date(data.check_in);
    }
    if (data.check_out && typeof data.check_out === 'string') {
      updateData.check_out = new Date(data.check_out);
    }
    return await Attendance.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('child_id', 'name birth_date')
      .populate('recorded_by', 'firstName lastName');
  }

  static async delete(id: string): Promise<IAttendanceDocument | null> {
    return await Attendance.findByIdAndDelete(id);
  }
}
