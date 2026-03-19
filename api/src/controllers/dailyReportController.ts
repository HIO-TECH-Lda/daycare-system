import { Request, Response } from 'express';
import { DailyReportService } from '../services/dailyReportService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import Child from '../models/Child';
import User from '../models/User';

export class DailyReportController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const childId = req.query.child_id as string | undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const { role, userId } = req.user!;

    const { reports, total } = await DailyReportService.findAllScoped(
      role, userId, childId, startDate, endDate, page, limit
    );
    return res.json(ApiResponse.paginated(reports, { page, limit, total }, 'Relatórios diários recuperados com sucesso'));
  });

  static getByChildId = catchAsync(async (req: Request, res: Response) => {
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const reports = await DailyReportService.findByChildId(req.params.childId, startDate, endDate);
    return res.json(ApiResponse.success(reports, 'Relatórios diários recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const report = await DailyReportService.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório diário não encontrado' });
    }
    return res.json(ApiResponse.success(report, 'Relatório diário recuperado com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const report = await DailyReportService.create({
      ...req.body,
      created_by: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(report, 'Relatório diário criado com sucesso', 201));

    // Fire-and-forget notification to parent
    (async () => {
      try {
        const child = await Child.findById(report.child_id);
        if (!child) return;
        const parent = await User.findById(child.parent_id);
        if (!parent) return;
        await NotificationService.newDailyReport({
          parentEmail: parent.email,
          parentPhone: parent.phone,
          parentName: parent.fullName,
          childName: child.name,
          childId: (child._id as any).toString(),
          reportDate: new Date(report.date).toLocaleDateString('pt-BR'),
          mood: report.mood
        });
      } catch (err) {
        console.error('[DailyReportController] Notification error:', err);
      }
    })();
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const report = await DailyReportService.update(req.params.id, req.body);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório diário não encontrado' });
    }
    return res.json(ApiResponse.success(report, 'Relatório diário atualizado com sucesso'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const report = await DailyReportService.delete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório diário não encontrado' });
    }
    return res.json(ApiResponse.success(null, 'Relatório diário excluído com sucesso'));
  });
}
