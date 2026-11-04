import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, requireStaff } from '../middleware/auth';
import { ReportService, parsePeriod } from '../services/reportService';
import { AccessService } from '../services/accessService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const router = Router();
router.use(authenticateToken);

const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
const objectId = (value: unknown) => {
  const v = str(value);
  if (v && !/^[a-f\d]{24}$/i.test(v)) throw new ApiError(400, 'Identificador inválido');
  return v;
};

// Finance: admins only. Query: from, to (YYYY-MM-DD, inclusive; default: this month so far)
router.get('/finance/summary', requireAdmin, catchAsync(async (req: Request, res: Response) => {
  const period = parsePeriod(str(req.query.from), str(req.query.to));
  return res.json(ApiResponse.success(await ReportService.financeSummary(period), 'Resumo financeiro'));
}));

router.get('/payments', requireAdmin, catchAsync(async (req: Request, res: Response) => {
  const period = parsePeriod(str(req.query.from), str(req.query.to));
  return res.json(ApiResponse.success(await ReportService.payments(period, str(req.query.method)), 'Relatório de pagamentos'));
}));

router.get('/expenses', requireAdmin, catchAsync(async (req: Request, res: Response) => {
  const period = parsePeriod(str(req.query.from), str(req.query.to));
  return res.json(ApiResponse.success(await ReportService.expenses(period, objectId(req.query.category_id)), 'Relatório de despesas'));
}));

// Attendance: admins (any class or all), staff (their own classes). Query: month (YYYY-MM), class_id
router.get('/attendance', requireStaff, catchAsync(async (req: Request, res: Response) => {
  const scope = await AccessService.scopeFor(req);
  const classId = objectId(req.query.class_id);
  if (!scope.all && (!classId || !AccessService.canSeeClass(scope, classId))) {
    throw new ApiError(403, 'Indique uma das suas turmas');
  }
  const month = str(req.query.month) ?? new Date().toISOString().slice(0, 7);
  const report = await ReportService.attendance(month, classId, scope.all ? undefined : scope.childIds);
  return res.json(ApiResponse.success(report, 'Relatório de presenças'));
}));

export default router;
