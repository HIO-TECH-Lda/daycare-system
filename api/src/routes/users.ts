import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requireAdmin, requireStaff } from '../middleware/auth';
import { validateRequest, createUserSchema, updateUserSchema, userStatusSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', requireStaff, UserController.getAll);
router.post('/', requireAdmin, validateRequest(createUserSchema), UserController.create);
router.get('/:id', requireAdmin, UserController.getById);
router.put('/:id', requireAdmin, validateRequest(updateUserSchema), UserController.update);
router.patch('/:id/status', requireAdmin, validateRequest(userStatusSchema), UserController.setStatus);
router.post('/:id/resend-invite', requireAdmin, UserController.resendInvite);
router.post('/:id/password-reset-link', requireAdmin, UserController.createPasswordResetLink);

export default router;
