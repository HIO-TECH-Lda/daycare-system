import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';
import {
  loginLimiter,
  inviteLimiter,
  forgotPasswordIpLimiter,
  forgotPasswordAccountLimiter,
  resetPasswordLimiter
} from '../middleware/rateLimits';
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
// Users log in with their email or phone number (`identifier`).
router.post('/login', loginLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), AuthController.refreshToken);
router.get('/invite/:token', inviteLimiter, AuthController.getInvite);
router.post('/accept-invite', inviteLimiter, validateRequest(acceptInviteSchema), AuthController.acceptInvite);
router.get('/me', authenticateToken, AuthController.getProfile);
router.put(
  '/me',
  authenticateToken,
  uploadAvatar,
  validateRequest(updateProfileSchema),
  AuthController.updateProfile
);
router.put('/change-password', authenticateToken, validateRequest(changePasswordSchema), AuthController.changePassword);
router.post(
  '/forgot-password',
  forgotPasswordIpLimiter,
  forgotPasswordAccountLimiter,
  validateRequest(forgotPasswordSchema),
  AuthController.forgotPassword
);
router.post('/reset-password', resetPasswordLimiter, validateRequest(resetPasswordSchema), AuthController.resetPassword);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
