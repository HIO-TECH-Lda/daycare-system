import { Router } from 'express';
import { CalendarEventController } from '../controllers/calendarEventController';
import { authenticateToken, requireStaff } from '../middleware/auth';
import { validateRequest, createCalendarEventSchema, updateCalendarEventSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', CalendarEventController.getAll);
router.get('/:id', CalendarEventController.getById);
router.post('/', requireStaff, validateRequest(createCalendarEventSchema), CalendarEventController.create);
router.put('/:id', requireStaff, validateRequest(updateCalendarEventSchema), CalendarEventController.update);
router.delete('/:id', requireStaff, CalendarEventController.delete);

export default router;
