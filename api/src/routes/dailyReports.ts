import { Router } from 'express';
import { DailyReportController } from '../controllers/dailyReportController';
import { authenticateToken, requireStaff } from '../middleware/auth';
import { validateRequest, createDailyReportSchema, updateDailyReportSchema } from '../utils/validation';
import { childParam, childInBody, recordAccess } from '../middleware/access';
import DailyReport from '../models/DailyReport';

const reportAccess = recordAccess((id) => DailyReport.findById(id).select('child_id').lean().then((r) => r?.child_id));

const router = Router();
router.use(authenticateToken);

router.get('/', DailyReportController.getAll);
router.get('/child/:childId', childParam(), DailyReportController.getByChildId);
router.get('/:id', reportAccess, DailyReportController.getById);
router.post('/', requireStaff, validateRequest(createDailyReportSchema), childInBody(), DailyReportController.create);
router.put('/:id', requireStaff, reportAccess, validateRequest(updateDailyReportSchema), childInBody(), DailyReportController.update);
router.delete('/:id', requireStaff, reportAccess, DailyReportController.delete);

export default router;
