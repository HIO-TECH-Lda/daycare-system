import { Router } from 'express';
import { MonthlyReportController } from '../controllers/monthlyReportController';
import { authenticateToken, requireAdmin, requireStaff } from '../middleware/auth';
import { validateRequest, createMonthlyReportSchema, updateMonthlyReportSchema } from '../utils/validation';
import { childParam, childInBody, recordAccess } from '../middleware/access';
import MonthlyReport from '../models/MonthlyReport';

// Parents only see validated reports
const reportAccess = recordAccess((id, scope) => MonthlyReport.findById(id).select('child_id status').lean()
  .then((r) => (r && (scope.role !== 'responsavel' || r.status === 'validated') ? r.child_id : null)));

const router = Router();
router.use(authenticateToken);

router.get('/', MonthlyReportController.getAll);
router.get('/child/:childId', childParam(), MonthlyReportController.getByChildId);
router.get('/:id', reportAccess, MonthlyReportController.getById);
router.post('/', requireStaff, validateRequest(createMonthlyReportSchema), childInBody(), MonthlyReportController.create);
router.put('/:id', requireStaff, reportAccess, validateRequest(updateMonthlyReportSchema), childInBody(), MonthlyReportController.update);
router.patch('/:id/validate', requireAdmin, MonthlyReportController.validate);
router.patch('/:id/reject', requireAdmin, MonthlyReportController.reject);
router.delete('/:id', requireAdmin, MonthlyReportController.delete);

export default router;
