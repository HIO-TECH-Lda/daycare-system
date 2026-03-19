import { Router } from 'express';
import { ActivityController } from '../controllers/activityController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, createActivitySchema, updateActivitySchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', ActivityController.getAll);
router.get('/:id', ActivityController.getById);
router.post('/', requireAdmin, validateRequest(createActivitySchema), ActivityController.create);
router.put('/:id', requireAdmin, validateRequest(updateActivitySchema), ActivityController.update);
router.delete('/:id', requireAdmin, ActivityController.delete);

export default router;
