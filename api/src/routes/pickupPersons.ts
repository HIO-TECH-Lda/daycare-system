import { Router } from 'express';
import { PickupPersonController } from '../controllers/pickupPersonController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, createPickupPersonSchema, updatePickupPersonSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', PickupPersonController.getAll);
router.get('/child/:childId', PickupPersonController.getByChildId);
router.get('/:id', PickupPersonController.getById);
router.post('/', requireAdmin, validateRequest(createPickupPersonSchema), PickupPersonController.create);
router.put('/:id', requireAdmin, validateRequest(updatePickupPersonSchema), PickupPersonController.update);
router.delete('/:id', requireAdmin, PickupPersonController.delete);

export default router;
