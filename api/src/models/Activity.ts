import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity {
  _id?: string;
  name: string;
  description?: string;
  class_id?: mongoose.Types.ObjectId; // Optional: activity for specific class
  age_group?: string; // e.g., "0-12 months", "12-24 months"
  duration_minutes?: number;
  materials_needed?: string[];
  learning_objectives?: string[];
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IActivityDocument extends Omit<IActivity, '_id'>, Document {}

const activitySchema = new Schema<IActivityDocument>(
  {
    name: {
      type: String,
      required: [true, 'Activity name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    class_id: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      default: null
    },
    age_group: {
      type: String,
      trim: true,
      default: ''
    },
    duration_minutes: {
      type: Number,
      min: 0
    },
    materials_needed: [{
      type: String,
      trim: true
    }],
    learning_objectives: [{
      type: String,
      trim: true
    }],
    is_active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

activitySchema.index({ class_id: 1 });
activitySchema.index({ is_active: 1 });
activitySchema.index({ name: 1 });

export default mongoose.model<IActivityDocument>('Activity', activitySchema);
