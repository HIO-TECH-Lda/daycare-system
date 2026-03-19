import { Router } from 'express';
import { ChildController } from '../controllers/childController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, createChildSchema, updateChildSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/children - List children (role-based filtering in controller)
router.get('/', ChildController.getAll);

// GET /api/v1/children/:id - Get child by ID (role-based access check in controller)
router.get('/:id', ChildController.getById);

// POST /api/v1/children - Create child (admin only)
router.post('/', requireAdmin, validateRequest(createChildSchema), ChildController.create);

// PUT /api/v1/children/:id - Update child (admin only)
router.put('/:id', requireAdmin, validateRequest(updateChildSchema), ChildController.update);

// DELETE /api/v1/children/:id - Delete child (admin only)
router.delete('/:id', requireAdmin, ChildController.delete);

export default router;
