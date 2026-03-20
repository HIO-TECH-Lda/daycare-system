import { Router } from 'express';
import { ChildController } from '../controllers/childController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { uploadPhoto } from '../middleware/upload';
import { validateRequest, createChildSchema, updateChildSchema } from '../utils/validation';

const router = Router();

router.use(authenticateToken);

router.get('/', ChildController.getAll);
router.get('/:id', ChildController.getById);
router.post('/', requireAdmin, uploadPhoto, validateRequest(createChildSchema), ChildController.create);
router.put('/:id', requireAdmin, uploadPhoto, validateRequest(updateChildSchema), ChildController.update);
router.delete('/:id', requireAdmin, ChildController.delete);

export default router;
