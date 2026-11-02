import mongoose, { Document, Schema } from 'mongoose';

export interface IClass {
  _id?: string;
  name: string;
  min_age_months: number;
  max_age_months: number;
  capacity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IClassDocument extends Omit<IClass, '_id'>, Document {}

const classSchema = new Schema<IClassDocument>(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      unique: true
    },
    min_age_months: {
      type: Number,
      required: [true, 'Minimum age in months is required'],
      min: [0, 'Minimum age cannot be negative']
    },
    max_age_months: {
      type: Number,
      required: [true, 'Maximum age in months is required'],
      min: [0, 'Maximum age cannot be negative']
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1']
    }
  },
  { timestamps: true }
);

// Validation: max_age_months should be >= min_age_months
classSchema.pre('save', function (next) {
  if (this.max_age_months < this.min_age_months) {
    next(new Error('Maximum age must be greater than or equal to minimum age'));
  } else {
    next();
  }
});


export default mongoose.model<IClassDocument>('Class', classSchema);
