import mongoose, { Document, Schema } from 'mongoose';

export interface IMonthlyReport {
  _id?: string;
  child_id: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  created_by: mongoose.Types.ObjectId;
  status?: 'draft' | 'submitted' | 'validated' | 'rejected';
  validated_by?: mongoose.Types.ObjectId;
  validated_at?: Date;
  rejection_reason?: string;
  attendance_summary?: {
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
  };
  physical_development?: string;
  cognitive_development?: string;
  social_development?: string;
  emotional_development?: string;
  general_notes?: string;
  achievements?: string;
  areas_for_improvement?: string;
  development_notes?: string;
  behavior_summary?: string;
  activities_participated?: string[];
  recommendations?: string;
  parent_feedback?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMonthlyReportDocument extends Omit<IMonthlyReport, '_id'>, Document {}

const monthlyReportSchema = new Schema<IMonthlyReportDocument>(
  {
    child_id: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required']
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 2000
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required']
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'validated', 'rejected'],
      default: 'draft'
    },
    validated_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    validated_at: {
      type: Date,
      default: null
    },
    rejection_reason: {
      type: String,
      default: ''
    },
    attendance_summary: {
      total_days: { type: Number, default: 0 },
      present_days: { type: Number, default: 0 },
      absent_days: { type: Number, default: 0 },
      late_days: { type: Number, default: 0 }
    },
    physical_development: {
      type: String,
      default: ''
    },
    cognitive_development: {
      type: String,
      default: ''
    },
    social_development: {
      type: String,
      default: ''
    },
    emotional_development: {
      type: String,
      default: ''
    },
    general_notes: {
      type: String,
      default: ''
    },
    achievements: {
      type: String,
      default: ''
    },
    areas_for_improvement: {
      type: String,
      default: ''
    },
    development_notes: {
      type: String,
      default: ''
    },
    behavior_summary: {
      type: String,
      default: ''
    },
    activities_participated: [{
      type: String,
      trim: true
    }],
    recommendations: {
      type: String,
      default: ''
    },
    parent_feedback: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Ensure one report per child per month/year
monthlyReportSchema.index({ child_id: 1, month: 1, year: 1 }, { unique: true });
monthlyReportSchema.index({ year: -1, month: -1 });
monthlyReportSchema.index({ created_by: 1 });

export default mongoose.model<IMonthlyReportDocument>('MonthlyReport', monthlyReportSchema);
