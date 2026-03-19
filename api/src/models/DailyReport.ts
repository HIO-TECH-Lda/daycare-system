import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyReport {
  _id?: string;
  child_id: mongoose.Types.ObjectId;
  date: Date;
  created_by: mongoose.Types.ObjectId; // Staff member who created it
  meals?: {
    breakfast?: string;
    lunch?: string;
    snack?: string;
    dinner?: string;
  };
  activities?: string[];
  nap_time?: {
    start?: Date;
    end?: Date;
    duration_minutes?: number;
  };
  mood?: string; // e.g., "Feliz", "Sonolento", "Irritado"
  notes?: string;
  behavior_notes?: string;
  health_notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDailyReportDocument extends Omit<IDailyReport, '_id'>, Document {}

const dailyReportSchema = new Schema<IDailyReportDocument>(
  {
    child_id: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required']
    },
    meals: {
      breakfast: { type: String, default: '' },
      lunch: { type: String, default: '' },
      snack: { type: String, default: '' },
      dinner: { type: String, default: '' }
    },
    activities: [{
      type: String,
      trim: true
    }],
    nap_time: {
      start: Date,
      end: Date,
      duration_minutes: Number
    },
    mood: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    behavior_notes: {
      type: String,
      default: ''
    },
    health_notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

dailyReportSchema.index({ child_id: 1, date: -1 });
dailyReportSchema.index({ date: -1 });
dailyReportSchema.index({ created_by: 1 });

export default mongoose.model<IDailyReportDocument>('DailyReport', dailyReportSchema);
