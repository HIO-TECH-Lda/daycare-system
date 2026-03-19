import { Router } from 'express';
import { MonthlyReportController } from '../controllers/monthlyReportController';
import { authenticateToken, requireAdmin, requireStaff } from '../middleware/auth';
import { validateRequest, createMonthlyReportSchema, updateMonthlyReportSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', MonthlyReportController.getAll);
router.get('/child/:childId', MonthlyReportController.getByChildId);
router.get('/:id', MonthlyReportController.getById);
router.post('/', requireStaff, validateRequest(createMonthlyReportSchema), MonthlyReportController.create);
router.put('/:id', requireStaff, validateRequest(updateMonthlyReportSchema), MonthlyReportController.update);
router.patch('/:id/validate', requireAdmin, MonthlyReportController.validate);
router.patch('/:id/reject', requireAdmin, MonthlyReportController.reject);
router.delete('/:id', requireAdmin, MonthlyReportController.delete);

export default router;
