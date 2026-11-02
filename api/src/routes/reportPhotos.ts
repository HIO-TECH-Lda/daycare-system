import { Router } from 'express';
import { ReportPhotoController } from '../controllers/reportPhotoController';
import { authenticateToken, requireStaff } from '../middleware/auth';
import { uploadPhoto } from '../middleware/upload';
import { validateRequest, createReportPhotoSchema } from '../utils/validation';
import { recordAccess } from '../middleware/access';
import { AccessService } from '../services/accessService';
import { catchAsync } from '../utils/catchAsync';
import DailyReport from '../models/DailyReport';
import ReportPhoto from '../models/ReportPhoto';

// Photos follow the daily report they belong to, which follows its child
const childOfReport = (reportId: unknown) =>
  reportId ? DailyReport.findById(reportId).select('child_id').lean().then((r) => r?.child_id) : Promise.resolve(undefined);
const reportAccess = recordAccess((_id, _scope, req) => childOfReport(req.params.reportId));
const photoAccess = recordAccess((id) => ReportPhoto.findById(id).select('daily_report_id').lean()
  .then((p) => (p ? childOfReport(p.daily_report_id) : null)));
const reportInBody = catchAsync(async (req, _res, next) => {
  const childId = await childOfReport(req.body.daily_report_id);
  AccessService.assertChild(await AccessService.scopeFor(req), childId);
  next();
});

const router = Router();

router.use(authenticateToken);

router.get('/report/:reportId', reportAccess, ReportPhotoController.getByReportId);
router.get('/:id', photoAccess, ReportPhotoController.getById);
router.post('/', requireStaff, uploadPhoto, validateRequest(createReportPhotoSchema), reportInBody, ReportPhotoController.create);
router.delete('/:id', requireStaff, photoAccess, ReportPhotoController.delete);

export default router;
