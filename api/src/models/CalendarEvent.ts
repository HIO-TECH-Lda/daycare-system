import mongoose, { Document, Schema } from 'mongoose';

export interface ICalendarEvent {
  _id?: string;
  title: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  is_all_day: boolean;
  event_type: 'holiday' | 'activity' | 'meeting' | 'reminder' | 'other';
  class_id?: mongoose.Types.ObjectId; // Optional: event for specific class
  created_by: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICalendarEventDocument extends Omit<ICalendarEvent, '_id'>, Document {}

const calendarEventSchema = new Schema<ICalendarEventDocument>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    start_date: {
      type: Date,
      required: [true, 'Start date is required']
    },
    end_date: {
      type: Date
    },
    is_all_day: {
      type: Boolean,
      default: false
    },
    event_type: {
      type: String,
      enum: ['holiday', 'activity', 'meeting', 'reminder', 'other'],
      default: 'other'
    },
    class_id: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      default: null
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required']
    }
  },
  { timestamps: true }
);

calendarEventSchema.index({ start_date: -1 });
calendarEventSchema.index({ class_id: 1 });
calendarEventSchema.index({ event_type: 1 });

export default mongoose.model<ICalendarEventDocument>('CalendarEvent', calendarEventSchema);
