import { Request, Response } from 'express';
import { MonthlyReportService } from '../services/monthlyReportService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import Child from '../models/Child';
import User from '../models/User';

export class MonthlyReportController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const childId = req.query.child_id as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const { role, userId } = req.user!;

    let reports, total;
    if (childId) {
      const result = await MonthlyReportService.findByChildId(childId, year, page, limit);
      reports = result.reports;
      total = result.total;
    } else if (month && year) {
      const result = await MonthlyReportService.findByMonthYear(month, year, page, limit);
      reports = result.reports;
      total = result.total;
    } else {
      const result = await MonthlyReportService.findAll(role, userId, page, limit);
      reports = result.reports;
      total = result.total;
    }
    return res.json(ApiResponse.paginated(reports, { page, limit, total }, 'Relatórios mensais recuperados com sucesso'));
  });

  static getByChildId = catchAsync(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const { reports, total } = await MonthlyReportService.findByChildId(req.params.childId, year, page, limit);
    return res.json(ApiResponse.paginated(reports, { page, limit, total }, 'Relatórios mensais recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const report = await MonthlyReportService.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório mensal não encontrado' });
    }
    return res.json(ApiResponse.success(report, 'Relatório mensal recuperado com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const report = await MonthlyReportService.create({
      ...req.body,
      created_by: req.user!.userId
    });
    return res.status(201).json(ApiResponse.success(report, 'Relatório mensal criado com sucesso', 201));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const report = await MonthlyReportService.update(req.params.id, req.body);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório mensal não encontrado' });
    }
    return res.json(ApiResponse.success(report, 'Relatório mensal atualizado com sucesso'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const report = await MonthlyReportService.delete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório mensal não encontrado' });
    }
    return res.json(ApiResponse.success(null, 'Relatório mensal excluído com sucesso'));
  });

  static validate = catchAsync(async (req: Request, res: Response) => {
    const report = await MonthlyReportService.validate(req.params.id, req.user!.userId);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório mensal não encontrado' });
    }
    res.json(ApiResponse.success(report, 'Relatório validado com sucesso'));

    // Fire-and-forget notification to parent
    (async () => {
      try {
        const child = await Child.findById(report.child_id);
        if (!child) return;
        const parent = await User.findById(child.parent_id);
        if (!parent) return;
        await NotificationService.monthlyReportValidated({
          parentEmail: parent.email,
          parentPhone: parent.phone,
          parentName: parent.fullName,
          childName: child.name,
          childId: (child._id as any).toString(),
          month: report.month,
          year: report.year
        });
      } catch (err) {
        console.error('[MonthlyReportController] Notification error:', err);
      }
    })();
    return;
  });

  static reject = catchAsync(async (req: Request, res: Response) => {
    const { rejection_reason } = req.body;
    if (!rejection_reason) {
      return res.status(400).json({ success: false, message: 'Motivo da rejeição é obrigatório' });
    }
    const report = await MonthlyReportService.reject(req.params.id, rejection_reason);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Relatório mensal não encontrado' });
    }
    return res.json(ApiResponse.success(report, 'Relatório rejeitado com sucesso'));
  });
}
