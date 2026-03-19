import { Request, Response } from 'express';
import { AuthService, formatUserForFrontend } from '../services/authService';
import { NotificationService } from '../services/notificationService';
import Messages from '../utils/messages';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response) {
    try {
      const { confirmPassword, ...userData } = req.body;
      
      const result = await AuthService.registerUser(userData);

      // Fire-and-forget welcome notification
      NotificationService.welcome({
        email: result.user.email,
        phone: result.user.phone,
        name: result.user.fullName,
        role: result.user.role
      });
      
      return res.status(201).json({
        success: true,
        message: Messages.AUTH.REGISTER_SUCCESS,
        data: {
          user: formatUserForFrontend(result.user),
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : Messages.AUTH.REGISTER_FAILED
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const result = await AuthService.loginUser(email, password);
      
      return res.json({
        success: true,
        message: Messages.AUTH.LOGIN_SUCCESS,
        data: {
          user: formatUserForFrontend(result.user),
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : Messages.AUTH.INVALID_CREDENTIALS
      });
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      const result = await AuthService.refreshToken(refreshToken);
      
      return res.json({
        success: true,
        message: Messages.AUTH.TOKEN_REFRESHED,
        data: {
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(401).json({
        success: false,
        message: Messages.AUTH.INVALID_REFRESH_TOKEN
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response) {
    try {
      const user = await AuthService.getUserById(req.user!.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: Messages.USER.NOT_FOUND
        });
      }
      
      return res.json({
        success: true,
        message: Messages.USER.PROFILE_RETRIEVED,
        data: { user: formatUserForFrontend(user) }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: Messages.USER.FETCH_FAILED
      });
    }
  }

  // Update user profile
  static async updateProfile(req: Request, res: Response) {
    try {
      const updatedUser = await AuthService.updateUserProfile(req.user!.userId, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: Messages.USER.NOT_FOUND
        });
      }
      
      return res.json({
        success: true,
        message: Messages.USER.UPDATED,
        data: { user: formatUserForFrontend(updatedUser) }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update profile'
      });
    }
  }

  // Change password
  static async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
      
      await AuthService.changePassword(req.user!.userId, currentPassword, newPassword);
      
      return res.json({
        success: true,
        message: Messages.AUTH.PASSWORD_CHANGED
      });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to change password'
      });
    }
  }

  // Logout (client-side token removal)
  static async logout(req: Request, res: Response) {
    return res.json({
      success: true,
      message: Messages.AUTH.LOGOUT_SUCCESS
    });
  }

  // Request password reset — generates a token stored on the user, ready for email delivery
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email é obrigatório' });
      }
      const resetResult = await AuthService.requestPasswordReset(email);

      // Fire-and-forget password reset notification
      NotificationService.passwordReset({
        email: resetResult.user.email,
        phone: resetResult.user.phone,
        name: resetResult.user.fullName,
        resetToken: resetResult.resetToken
      });

      return res.json({ success: true, message: Messages.AUTH.PASSWORD_RESET_EMAIL_SENT });
    } catch (error) {
      // Always return the same message to avoid exposing whether the email exists
      return res.json({ success: true, message: Messages.AUTH.PASSWORD_RESET_EMAIL_SENT });
    }
  }

  // Reset password with token
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      const user = await AuthService.resetPassword(token, newPassword);
      
      return res.json({
        success: true,
        message: Messages.AUTH.PASSWORD_RESET_SUCCESS
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset password'
      });
    }
  }

}
