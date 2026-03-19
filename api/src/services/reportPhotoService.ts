import ReportPhoto, { IReportPhotoDocument } from '../models/ReportPhoto';
import mongoose from 'mongoose';

export class ReportPhotoService {
  static async create(data: {
    daily_report_id: string;
    photo_url: string;
    caption?: string;
    uploaded_by: string;
  }): Promise<IReportPhotoDocument> {
    const photoData = {
      ...data,
      daily_report_id: new mongoose.Types.ObjectId(data.daily_report_id),
      uploaded_by: new mongoose.Types.ObjectId(data.uploaded_by)
    };
    const photo = await ReportPhoto.create(photoData);
    return await photo.populate('daily_report_id', 'child_id date')
      .populate('uploaded_by', 'firstName lastName');
  }

  static async findByReportId(reportId: string): Promise<IReportPhotoDocument[]> {
    return await ReportPhoto.find({ daily_report_id: new mongoose.Types.ObjectId(reportId) })
      .populate('uploaded_by', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  static async findById(id: string): Promise<IReportPhotoDocument | null> {
    return await ReportPhoto.findById(id)
      .populate('daily_report_id', 'child_id date')
      .populate('uploaded_by', 'firstName lastName');
  }

  static async delete(id: string): Promise<IReportPhotoDocument | null> {
    return await ReportPhoto.findByIdAndDelete(id);
  }

  static async deleteByReportId(reportId: string): Promise<void> {
    await ReportPhoto.deleteMany({ daily_report_id: new mongoose.Types.ObjectId(reportId) });
  }
}
