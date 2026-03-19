import mongoose, { Document, Schema } from 'mongoose';

export interface IStaffAssignment {
  _id?: string;
  staff_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStaffAssignmentDocument extends Omit<IStaffAssignment, '_id'>, Document {}

const staffAssignmentSchema = new Schema<IStaffAssignmentDocument>(
  {
    staff_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff user is required']
    },
    class_id: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required']
    }
  },
  { timestamps: true }
);

// One staff can be assigned to a class only once
staffAssignmentSchema.index({ staff_id: 1, class_id: 1 }, { unique: true });
staffAssignmentSchema.index({ staff_id: 1 });
staffAssignmentSchema.index({ class_id: 1 });

export default mongoose.model<IStaffAssignmentDocument>('StaffAssignment', staffAssignmentSchema);
