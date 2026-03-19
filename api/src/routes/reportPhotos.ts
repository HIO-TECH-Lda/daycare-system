import { Router } from 'express';
import { ReportPhotoController } from '../controllers/reportPhotoController';
import { authenticateToken, requireStaff } from '../middleware/auth';
import { validateRequest, createReportPhotoSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/report/:reportId', ReportPhotoController.getByReportId);
router.get('/:id', ReportPhotoController.getById);
router.post('/', requireStaff, validateRequest(createReportPhotoSchema), ReportPhotoController.create);
router.delete('/:id', requireStaff, ReportPhotoController.delete);

export default router;
