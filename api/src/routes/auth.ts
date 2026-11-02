import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';
import { loginLimiter, sensitiveAuthLimiter } from '../middleware/rateLimits';
import {
  validateRequest,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  refreshTokenSchema,
  acceptInviteSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../utils/validation';

const router = Router();

// There is no public registration: accounts are created by admins (POST /users) and activated via invite.
router.post('/login', loginLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), AuthController.refreshToken);
router.get('/invite/:token', sensitiveAuthLimiter, AuthController.getInvite);
router.post('/accept-invite', sensitiveAuthLimiter, validateRequest(acceptInviteSchema), AuthController.acceptInvite);
router.get('/me', authenticateToken, AuthController.getProfile);
router.put(
  '/me',
  authenticateToken,
  uploadAvatar,
  validateRequest(updateProfileSchema),
  AuthController.updateProfile
);
router.put('/change-password', authenticateToken, validateRequest(changePasswordSchema), AuthController.changePassword);
router.post('/forgot-password', sensitiveAuthLimiter, validateRequest(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', sensitiveAuthLimiter, validateRequest(resetPasswordSchema), AuthController.resetPassword);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
