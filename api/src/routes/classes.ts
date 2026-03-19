import { Router } from 'express';
import { ClassController } from '../controllers/classController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, createClassSchema, updateClassSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/classes - List all classes (any authenticated user)
router.get('/', ClassController.getAll);

// GET /api/v1/classes/:id - Get class by ID (any authenticated user)
router.get('/:id', ClassController.getById);

// POST /api/v1/classes - Create class (admin only)
router.post('/', requireAdmin, validateRequest(createClassSchema), ClassController.create);

// PUT /api/v1/classes/:id - Update class (admin only)
router.put('/:id', requireAdmin, validateRequest(updateClassSchema), ClassController.update);

// DELETE /api/v1/classes/:id - Delete class (admin only)
router.delete('/:id', requireAdmin, ClassController.delete);

export default router;
