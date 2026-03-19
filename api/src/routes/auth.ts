import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';
import {
  validateRequest,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  refreshTokenSchema
} from '../utils/validation';

const router = Router();

const normalizeProfileBody = (req: Request, _res: Response, next: NextFunction) => {
  if ((req as any).file) {
    const file = (req as any).file;
    (req as any).body.avatar = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
  next();
};

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), AuthController.refreshToken);
router.get('/me', authenticateToken, AuthController.getProfile);
router.put(
  '/me',
  authenticateToken,
  uploadAvatar,
  normalizeProfileBody,
  validateRequest(updateProfileSchema),
  AuthController.updateProfile
);
router.put('/change-password', authenticateToken, validateRequest(changePasswordSchema), AuthController.changePassword);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
