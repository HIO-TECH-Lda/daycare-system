import { Router } from 'express';
import { GuardianController } from '../controllers/guardianController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, createGuardianSchema, updateGuardianSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/guardians - List guardians (optional ?child_id=xxx filter)
router.get('/', GuardianController.getAll);

// GET /api/v1/guardians/child/:childId - Get guardians for a child
router.get('/child/:childId', GuardianController.getByChildId);

// GET /api/v1/guardians/:id - Get guardian by ID
router.get('/:id', GuardianController.getById);

// POST /api/v1/guardians - Create guardian (admin only)
router.post('/', requireAdmin, validateRequest(createGuardianSchema), GuardianController.create);

// PUT /api/v1/guardians/:id - Update guardian (admin only)
router.put('/:id', requireAdmin, validateRequest(updateGuardianSchema), GuardianController.update);

// DELETE /api/v1/guardians/:id - Delete guardian (admin only)
router.delete('/:id', requireAdmin, GuardianController.delete);

export default router;
