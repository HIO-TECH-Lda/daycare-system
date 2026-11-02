import { Router } from 'express';
import { StaffAssignmentController } from '../controllers/staffAssignmentController';
import { authenticateToken, requireAdmin, requireStaff } from '../middleware/auth';
import { validateRequest, createStaffAssignmentSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/staff-assignments - List assignments (admin: all or ?staff_id=; staff: own)
router.get('/', requireStaff, StaffAssignmentController.getAll);

// GET /api/v1/staff-assignments/:id - Get assignment by ID
router.get('/:id', requireStaff, StaffAssignmentController.getById);

// POST /api/v1/staff-assignments - Create assignment (admin only)
router.post('/', requireAdmin, validateRequest(createStaffAssignmentSchema), StaffAssignmentController.create);

// DELETE /api/v1/staff-assignments/:id - Remove assignment (admin only)
router.delete('/:id', requireAdmin, StaffAssignmentController.delete);

export default router;
