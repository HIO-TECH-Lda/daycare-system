import { Request, Response } from 'express';
import { ReportPhotoService } from '../services/reportPhotoService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';

export class ReportPhotoController {
  static getByReportId = catchAsync(async (req: Request, res: Response) => {
    const photos = await ReportPhotoService.findByReportId(req.params.reportId);
    res.json(ApiResponse.success(photos, 'Fotos recuperadas com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const photo = await ReportPhotoService.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Foto não encontrada' });
    }
    return res.json(ApiResponse.success(photo, 'Foto recuperada com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const photo = await ReportPhotoService.create({
      ...req.body,
      uploaded_by: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(photo, 'Foto adicionada com sucesso', 201));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const photo = await ReportPhotoService.delete(req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Foto não encontrada' });
    }
    return res.json(ApiResponse.success(null, 'Foto excluída com sucesso'));
  });
}
