import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance {
  client_id?: string;
  _id?: string;
  child_id: mongoose.Types.ObjectId;
  date: Date;
  check_in?: Date;
  check_out?: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recorded_by: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAttendanceDocument extends Omit<IAttendance, '_id'>, Document {}

const attendanceSchema = new Schema<IAttendanceDocument>(
  {
    child_id: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required']
    },
    check_in: {
      type: Date
    },
    check_out: {
      type: Date
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: [true, 'Status is required'],
      default: 'present'
    },
    notes: {
      type: String,
      default: ''
    },
    // Id the staff app gives a record it may send again after being offline (see utils/syncWrite)
    client_id: { type: String },
    recorded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by is required']
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ child_id: 1, date: -1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ status: 1 });
// One attendance record per child per day (dates are stored as the centre's calendar day, see utils/dates)
attendanceSchema.index({ child_id: 1, date: 1 }, { unique: true });
attendanceSchema.index({ client_id: 1 }, { unique: true, partialFilterExpression: { client_id: { $gt: '' } } });

export default mongoose.model<IAttendanceDocument>('Attendance', attendanceSchema);
