import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { authenticateToken, requireRole, requireStaff } from '../middleware/auth';
import { validateRequest, absenceNoticeSchema, createAttendanceSchema, updateAttendanceSchema } from '../utils/validation';
import { childParam, childInBody, recordAccess } from '../middleware/access';
import Attendance from '../models/Attendance';

// Records follow their child: parents see their children's, staff their classes', admins all
const attendanceAccess = recordAccess((id) => Attendance.findById(id).select('child_id').lean().then((r) => r?.child_id));

const router = Router();
router.use(authenticateToken);

router.get('/', AttendanceController.getAll);
router.get('/child/:childId', childParam(), AttendanceController.getByChildId);
router.get('/:id', attendanceAccess, AttendanceController.getById);
router.post('/', requireStaff, validateRequest(createAttendanceSchema), childInBody(), AttendanceController.create);
router.post('/absence-notice', requireRole('responsavel'), validateRequest(absenceNoticeSchema), childInBody(), AttendanceController.notifyAbsence);
router.put('/:id', requireStaff, attendanceAccess, validateRequest(updateAttendanceSchema), childInBody(), AttendanceController.update);
router.delete('/:id', requireStaff, attendanceAccess, AttendanceController.delete);

export default router;
