import { Router } from 'express';
import { PickupPersonController } from '../controllers/pickupPersonController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { uploadPhoto } from '../middleware/upload';
import { validateRequest, createPickupPersonSchema, updatePickupPersonSchema } from '../utils/validation';
import { childParam, recordAccess } from '../middleware/access';
import PickupPerson from '../models/PickupPerson';

const router = Router();

router.use(authenticateToken);

router.get('/', PickupPersonController.getAll);
router.get('/child/:childId', childParam(), PickupPersonController.getByChildId);
router.get('/:id', recordAccess((id) => PickupPerson.findById(id).select('child_id').lean().then((r) => r?.child_id)), PickupPersonController.getById);
router.post('/', requireAdmin, uploadPhoto, validateRequest(createPickupPersonSchema), PickupPersonController.create);
router.put('/:id', requireAdmin, uploadPhoto, validateRequest(updatePickupPersonSchema), PickupPersonController.update);
router.delete('/:id', requireAdmin, PickupPersonController.delete);

export default router;
