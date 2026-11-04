import CalendarEvent, { ICalendarEventDocument } from '../models/CalendarEvent';
import mongoose from 'mongoose';

export class CalendarEventService {
  static async create(data: {
    title: string;
    description?: string;
    start_date: Date | string;
    end_date?: Date | string;
    is_all_day?: boolean;
    event_type: 'holiday' | 'activity' | 'meeting' | 'reminder' | 'other';
    class_id?: string;
    created_by: string;
  }): Promise<ICalendarEventDocument> {
    const eventData: any = {
      ...data,
      created_by: new mongoose.Types.ObjectId(data.created_by),
      start_date: typeof data.start_date === 'string' ? new Date(data.start_date) : data.start_date
    };
    if (data.end_date) {
      eventData.end_date = typeof data.end_date === 'string' ? new Date(data.end_date) : data.end_date;
    }
    if (data.class_id) {
      eventData.class_id = new mongoose.Types.ObjectId(data.class_id);
    }
    const event = await CalendarEvent.create(eventData);
    await event.populate([
      { path: 'class_id', select: 'name' },
      { path: 'created_by', select: 'firstName lastName' }
    ]);
    return event;
  }

  static async findAll(startDate?: Date, endDate?: Date, classId?: string, page = 1, limit = 20, scope: Record<string, unknown> = {}): Promise<{ events: ICalendarEventDocument[]; total: number }> {
    const query: any = { ...scope };
    if (startDate || endDate) {
      query.start_date = {};
      if (startDate) query.start_date.$gte = startDate;
      if (endDate) query.start_date.$lte = endDate;
    }
    if (classId) query.class_id = new mongoose.Types.ObjectId(classId);
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      CalendarEvent.find(query)
        .populate('class_id', 'name')
        .populate('created_by', 'firstName lastName')
        .sort({ start_date: 1 })
        .skip(skip)
        .limit(limit),
      CalendarEvent.countDocuments(query)
    ]);
    return { events, total };
  }

  static async findById(id: string): Promise<ICalendarEventDocument | null> {
    return await CalendarEvent.findById(id)
      .populate('class_id', 'name')
      .populate('created_by', 'firstName lastName');
  }

  static async update(id: string, data: Partial<any>): Promise<ICalendarEventDocument | null> {
    const updateData: any = { ...data };
    if (data.start_date && typeof data.start_date === 'string') {
      updateData.start_date = new Date(data.start_date);
    }
    if (data.end_date && typeof data.end_date === 'string') {
      updateData.end_date = new Date(data.end_date);
    }
    if (data.class_id) {
      updateData.class_id = new mongoose.Types.ObjectId(data.class_id);
    }
    return await CalendarEvent.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('class_id', 'name')
      .populate('created_by', 'firstName lastName');
  }

  static async delete(id: string): Promise<ICalendarEventDocument | null> {
    return await CalendarEvent.findByIdAndDelete(id);
  }
}
