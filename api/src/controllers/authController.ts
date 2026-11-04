import { Request, Response } from 'express';
import { AuthService, formatUserForFrontend } from '../services/authService';
import { NotificationService } from '../services/notificationService';
import { CloudinaryService } from '../services/cloudinaryService';
import { UserService } from '../services/userService';
import Messages from '../utils/messages';
import ApiResponse from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';
import { runInBackground } from '../utils/background';

// Unexpected errors (e.g. database down) go to the global error handler as a generic 500;
// only ApiErrors carry a message meant for the user.

/** What the user typed to identify themselves. `email` is still accepted from older clients. */
function identifierFrom(body: { identifier?: string; email?: string }): string {
  return body.identifier ?? body.email ?? '';
}

export class AuthController {
  // Login with email or phone number
  static login = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.loginUser(identifierFrom(req.body), req.body.password);
    return res.json(ApiResponse.success({
      user: formatUserForFrontend(result.user),
      token: result.token,
      refreshToken: result.refreshToken
    }, Messages.AUTH.LOGIN_SUCCESS));
  });

  static refreshToken = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.refreshToken(req.body.refreshToken);
    return res.json(ApiResponse.success(result, Messages.AUTH.TOKEN_REFRESHED));
  });

  static getProfile = catchAsync(async (req: Request, res: Response) => {
    const user = await AuthService.getUserById(req.user!.userId);
    if (!user) throw new ApiError(404, Messages.USER.NOT_FOUND);
    return res.json(ApiResponse.success({ user: formatUserForFrontend(user) }, Messages.USER.PROFILE_RETRIEVED));
  });

  static updateProfile = catchAsync(async (req: Request, res: Response) => {
    // If a file was uploaded, push it to Cloudinary and use the returned URL
    if ((req as any).file) {
      const file = (req as any).file as Express.Multer.File;
      const { url } = await CloudinaryService.upload(file.buffer, 'avatars');
      req.body.avatar = url;
    }

    const updatedUser = await AuthService.updateUserProfile(req.user!.userId, req.body);
    if (!updatedUser) throw new ApiError(404, Messages.USER.NOT_FOUND);
    return res.json(ApiResponse.success({ user: formatUserForFrontend(updatedUser) }, Messages.USER.UPDATED));
  });

  // Change password: other sessions end; the response carries new tokens for this one
  static changePassword = catchAsync(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const tokens = await AuthService.changePassword(req.user!.userId, currentPassword, newPassword);
    return res.json(ApiResponse.success(tokens, Messages.AUTH.PASSWORD_CHANGED_SESSIONS_ENDED));
  });

  // Logout (client-side token removal)
  static async logout(_req: Request, res: Response) {
    return res.json({
      success: true,
      message: Messages.AUTH.LOGOUT_SUCCESS
    });
  }

  /**
   * Forgot password, by email or phone. Always answers the same way, immediately; the lookup and
   * sending happen after the response so the timing doesn't reveal whether an account exists.
   * Users who never activated their account get their invite again instead of a reset link.
   */
  static forgotPassword = catchAsync(async (req: Request, res: Response) => {
    const identifier = identifierFrom(req.body);

    runInBackground('forgot-password', async () => {
      const result = await AuthService.requestPasswordReset(identifier);
      if (result?.kind === 'reset') {
        await NotificationService.passwordReset({ user: result.user, resetToken: result.resetToken });
      } else if (result?.kind === 'invite') {
        await UserService.reissueInvite(result.user);
      }
    });

    return res.json(ApiResponse.success(null, Messages.AUTH.PASSWORD_RESET_EMAIL_SENT));
  });

  static resetPassword = catchAsync(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    await AuthService.resetPassword(token, newPassword);
    return res.json(ApiResponse.success(null, Messages.AUTH.PASSWORD_RESET_SUCCESS));
  });

  // Look up a pending invite so the accept page can greet the user
  static getInvite = catchAsync(async (req: Request, res: Response) => {
    const user = await AuthService.findPendingInvite(req.params.token);
    return res.json(ApiResponse.success({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      whatsappOptIn: !!user.whatsappOptIn
    }, Messages.INVITE.VALID));
  });

  // Accept an invite: set password + WhatsApp choice, then log the user in
  static acceptInvite = catchAsync(async (req: Request, res: Response) => {
    const { token, password, whatsappOptIn } = req.body;
    const result = await AuthService.acceptInvite(token, password, whatsappOptIn);
    return res.json(ApiResponse.success({
      user: formatUserForFrontend(result.user),
      token: result.token,
      refreshToken: result.refreshToken
    }, Messages.INVITE.ACCEPTED));
  });
}
