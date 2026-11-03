import { Request, Response } from 'express';
import { runInBackground } from '../utils/background';
import { MonthlyReportService } from '../services/monthlyReportService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import Child from '../models/Child';
import User from '../models/User';
import { AccessService } from '../services/accessService';
import MonthlyReport from '../models/MonthlyReport';
import { ApiError } from '../utils/ApiError';

// Parents only see reports once the administration has validated them
const visibleStatuses = (role: string) => (role === 'responsavel' ? { status: 'validated' } : {});

/**
 * Educators write drafts and submit them; only the administration validates or rejects (through
 * /validate and /reject), so an educator can't publish a report to the family by setting its
 * status, nor change one that's already validated.
 */
function educatorChanges(body: Record<string, unknown>): Record<string, unknown> {
  const { status, rejection_reason: _reason, validated_by: _by, validated_at: _at, ...changes } = body;
  if (status !== undefined && status !== 'draft' && status !== 'submitted') {
    throw new ApiError(403, 'Só a administração pode validar ou recusar relatórios');
  }
  return status === undefined ? changes : { ...changes, status };
}

export class MonthlyReportController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const childId = req.query.child_id as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const scope = await AccessService.scopeFor(req);
    const statusFilter = visibleStatuses(scope.role);
    if (childId) AccessService.assertChild(scope, childId);

    let reports, total;
    if (childId) {
      const result = await MonthlyReportService.findByChildId(childId, year, page, limit, statusFilter);
      reports = result.reports;
      total = result.total;
    } else if (month && year) {
      const result = await MonthlyReportService.findByMonthYear(month, year, page, limit, { ...AccessService.childFilter(scope), ...statusFilter });
      reports = result.reports;
      total = result.total;
    } else {
      const result = await MonthlyReportService.findAll({ ...AccessService.childFilter(scope), ...statusFilter }, page, limit);
      reports = result.reports;
      total = result.total;
    }
    return res.json(ApiResponse.paginated(reports, { page, limit, total }, 'Relatórios mensais recuperados com sucesso'));
  });

  static getByChildId = catchAsync(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const { reports, total } = await MonthlyReportService.findByChildId(req.params.childId, year, page, limit, visibleStatuses(req.user!.role));
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
    const body = req.user!.role === 'administrador' ? req.body : educatorChanges(req.body);
    if (await MonthlyReport.exists({ child_id: body.child_id, month: body.month, year: body.year })) {
      throw new ApiError(409, 'Já existe um relatório desta criança para este mês');
    }
    const report = await MonthlyReportService.create({
      ...body,
      created_by: req.user!.userId
    } as Parameters<typeof MonthlyReportService.create>[0]);
    return res.status(201).json(ApiResponse.success(report, 'Relatório mensal criado com sucesso', 201));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    let changes = req.body;
    if (req.user!.role !== 'administrador') {
      const current = await MonthlyReport.findById(req.params.id).select('status').lean();
      if (current?.status === 'validated') throw new ApiError(409, 'Este relatório já foi validado e enviado à família');
      changes = educatorChanges(req.body);
    }
    const report = await MonthlyReportService.update(req.params.id, changes);
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
    runInBackground('MonthlyReportController notification', async () => {
      try {
        const child = await Child.findById(report.child_id);
        if (!child) return;
        const parent = await User.findById(child.parent_id);
        if (!parent) return;
        await NotificationService.monthlyReportValidated({
          parent,
          childName: child.name,
          month: report.month,
          year: report.year
        });
      } catch (err) {
        console.error('[MonthlyReportController] Notification error:', err);
      }
    });
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
