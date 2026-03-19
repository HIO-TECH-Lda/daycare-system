import { Router } from 'express';
import { DailyReportController } from '../controllers/dailyReportController';
import { authenticateToken, requireStaff } from '../middleware/auth';
import { validateRequest, createDailyReportSchema, updateDailyReportSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', DailyReportController.getAll);
router.get('/child/:childId', DailyReportController.getByChildId);
router.get('/:id', DailyReportController.getById);
router.post('/', requireStaff, validateRequest(createDailyReportSchema), DailyReportController.create);
router.put('/:id', requireStaff, validateRequest(updateDailyReportSchema), DailyReportController.update);
router.delete('/:id', requireStaff, DailyReportController.delete);

export default router;
