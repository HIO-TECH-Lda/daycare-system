import { Router } from 'express';
import { PickupPersonController } from '../controllers/pickupPersonController';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';
import { uploadPhoto } from '../middleware/upload';
import { validateRequest, createPickupPersonSchema, pickupTodaySchema, updatePickupPersonSchema } from '../utils/validation';
import { childInBody, childParam, recordAccess } from '../middleware/access';
import PickupPerson from '../models/PickupPerson';

const router = Router();

router.use(authenticateToken);

router.get('/', PickupPersonController.getAll);
router.get('/child/:childId', childParam(), PickupPersonController.getByChildId);
const pickupAccess = recordAccess((id) => PickupPerson.findById(id).select('child_id').lean().then((r) => r?.child_id));

router.get('/:id', pickupAccess, PickupPersonController.getById);
router.post('/', requireAdmin, uploadPhoto, validateRequest(createPickupPersonSchema), PickupPersonController.create);
// Parents: someone else collects today (one day only)
router.post('/today', requireRole('responsavel'), uploadPhoto, validateRequest(pickupTodaySchema), childInBody(), PickupPersonController.createForToday);
router.delete('/today/:id', requireRole('responsavel'), pickupAccess, PickupPersonController.cancelForToday);
router.put('/:id', requireAdmin, uploadPhoto, validateRequest(updatePickupPersonSchema), PickupPersonController.update);
router.delete('/:id', requireAdmin, PickupPersonController.delete);

export default router;
