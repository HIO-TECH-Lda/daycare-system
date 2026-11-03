import { Request, Response } from 'express';
import { runInBackground } from '../utils/background';
import { changedSince } from '../utils/syncWrite';
import DailyReport from '../models/DailyReport';
import { DailyReportService } from '../services/dailyReportService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import Child from '../models/Child';
import User from '../models/User';
import { AccessService } from '../services/accessService';

export class DailyReportController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const childId = req.query.child_id as string | undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const { role, userId } = req.user!;
    if (childId) AccessService.assertChild(await AccessService.scopeFor(req), childId);

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

  // Offline-safe like attendance: one report per child per day, newest write wins; a conflict
  // only when someone else wrote it last (the app autosaves the same report many times)
  static create = catchAsync(async (req: Request, res: Response) => {
    const { child_id, date, client_id, ...fields } = req.body;
    const { doc: report, outcome, previous } = await DailyReportService.record(
      child_id, date ?? new Date(), { ...fields, created_by: req.user!.userId }, client_id
    );
    const conflict = outcome === 'merged' && String(previous?.created_by) !== req.user!.userId;
    res.status(outcome === 'created' ? 201 : 200).json({
      ...ApiResponse.success(report, 'Relatório diário guardado'),
      sync: outcome,
      ...(conflict && { conflict: true, previous })
    });

    // "New report" message to the family only when the day's report is first created
    if (outcome !== 'created') return;
    runInBackground('DailyReportController notification', async () => {
      const child = await Child.findById(child_id);
      if (!child) return;
      const parent = await User.findById(child.parent_id);
      if (!parent) return;
      await NotificationService.newDailyReport({
        parent,
        childName: child.name,
        reportDate: new Date(report.date).toLocaleDateString('pt-PT'),
        mood: report.mood
      });
    });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const { base_updated_at, ...changes } = req.body;
    const before = await DailyReport.findById(req.params.id).lean();
    const report = await DailyReportService.update(req.params.id, changes);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório diário não encontrado' });
    }
    const conflict = changedSince(before, base_updated_at);
    return res.json({
      ...ApiResponse.success(report, 'Relatório diário atualizado com sucesso'),
      ...(conflict && { conflict: true, previous: before })
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const report = await DailyReportService.delete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório diário não encontrado' });
    }
    return res.json(ApiResponse.success(null, 'Relatório diário excluído com sucesso'));
  });
}
