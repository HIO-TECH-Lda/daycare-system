import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { authenticateToken, requireStaff } from '../middleware/auth';
import { validateRequest, createAttendanceSchema, updateAttendanceSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', AttendanceController.getAll);
router.get('/child/:childId', AttendanceController.getByChildId);
router.get('/:id', AttendanceController.getById);
router.post('/', requireStaff, validateRequest(createAttendanceSchema), AttendanceController.create);
router.put('/:id', requireStaff, validateRequest(updateAttendanceSchema), AttendanceController.update);
router.delete('/:id', requireStaff, AttendanceController.delete);

export default router;
