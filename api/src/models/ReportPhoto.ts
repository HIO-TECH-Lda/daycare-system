import mongoose, { Document, Schema } from 'mongoose';
import { mediaJsonTransform } from '../utils/media';

export interface IReportPhoto {
  _id?: string;
  daily_report_id: mongoose.Types.ObjectId;
  photo_url: string;
  caption?: string;
  uploaded_by: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReportPhotoDocument extends Omit<IReportPhoto, '_id'>, Document {}

const reportPhotoSchema = new Schema<IReportPhotoDocument>(
  {
    daily_report_id: {
      type: Schema.Types.ObjectId,
      ref: 'DailyReport',
      required: [true, 'Daily report ID is required']
    },
    photo_url: {
      type: String,
      required: [true, 'Photo URL is required']
    },
    caption: {
      type: String,
      default: ''
    },
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploaded by is required']
    }
  },
  // The stored file URL is private: responses carry a signed media link instead
  { timestamps: true, toJSON: { transform: mediaJsonTransform('report-photos', 'photo_url') } }
);

reportPhotoSchema.index({ daily_report_id: 1 });
reportPhotoSchema.index({ uploaded_by: 1 });

export default mongoose.model<IReportPhotoDocument>('ReportPhoto', reportPhotoSchema);
