import jwt from 'jsonwebtoken';
import User, { IUserDocument } from '../models/User';
import { JWTPayload } from '../types';
import Messages from '../utils/messages';
import { uploadBase64Image } from '../utils/cloudinary';
import { ApiError } from '../utils/ApiError';
import { generateOneTimeToken, hashToken } from '../utils/tokens';

// Format user for frontend (matches frontend User type)
export function formatUserForFrontend(user: IUserDocument) {
  return {
    id: (user._id as any).toString(),
    email: user.email,
    name: user.fullName,
    role: user.role,
    phone: user.phone || ''
  };
}

export class AuthService {
  // Generate JWT token
  static generateToken(user: IUserDocument): string {
    const payload: JWTPayload = {
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as jwt.SignOptions);
  }

  // Generate refresh token — uses JWT_REFRESH_SECRET to keep it separate from access tokens
  static generateRefreshToken(user: IUserDocument): string {
    const payload: JWTPayload = {
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    } as jwt.SignOptions);
  }

  // Verify user credentials. Returns null for unknown email or wrong password;
  // throws ApiError(401) when the password is right but the account is not active.
  static async verifyCredentials(email: string, password: string): Promise<IUserDocument | null> {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return null;
    }

    if (user.status === 'inactive' || user.status === 'suspended') {
      throw new ApiError(401, Messages.AUTH.ACCOUNT_DISABLED);
    }
    if (user.status !== 'active') {
      throw new ApiError(401, Messages.AUTH.ACCOUNT_NOT_ACTIVE);
    }

    return user;
  }

  // Login user
  static async loginUser(email: string, password: string): Promise<{ user: IUserDocument; token: string; refreshToken: string }> {
    const user = await this.verifyCredentials(email, password);

    if (!user) {
      throw new ApiError(401, Messages.AUTH.INVALID_CREDENTIALS);
    }

    return { user, ...this.issueTokens(user) };
  }

  static issueTokens(user: IUserDocument): { token: string; refreshToken: string } {
    return { token: this.generateToken(user), refreshToken: this.generateRefreshToken(user) };
  }

  // Look up a pending invite (for the "accept invite" page)
  static async findPendingInvite(inviteToken: string): Promise<IUserDocument> {
    const user = await User.findOne({
      inviteTokenHash: hashToken(inviteToken),
      inviteExpires: { $gt: new Date() },
      status: 'invited'
    });

    if (!user) {
      throw new ApiError(400, Messages.INVITE.INVALID);
    }

    return user;
  }

  // Accept an invite: set the password, record WhatsApp consent, activate and log in
  static async acceptInvite(
    inviteToken: string,
    password: string,
    whatsappOptIn: boolean
  ): Promise<{ user: IUserDocument; token: string; refreshToken: string }> {
    const user = await this.findPendingInvite(inviteToken);

    user.password = password;
    user.status = 'active';
    user.activatedAt = new Date();
    user.inviteTokenHash = undefined;
    user.inviteExpires = undefined;
    user.whatsappOptIn = whatsappOptIn;
    user.whatsappOptInAt = whatsappOptIn ? new Date() : undefined;
    await user.save();

    return { user, ...this.issueTokens(user) };
  }

  // Refresh token — verifies with JWT_REFRESH_SECRET
  static async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!) as JWTPayload;
      
      const user = await User.findById(decoded.userId);
      
      if (!user || user.status !== 'active') {
        throw new Error(Messages.AUTH.INVALID_REFRESH_TOKEN);
      }

      // Generate new tokens
      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return { token: newToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<IUserDocument | null> {
    try {
      return await User.findById(userId);
    } catch (error) {
      return null;
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updateData: Partial<IUserDocument>): Promise<IUserDocument | null> {
    // Remove sensitive fields that shouldn't be updated directly
    const { password, email, role, status, ...safeUpdateData } = updateData as any;

    // Upload avatar to Cloudinary if provided (base64 or file data)
    if (safeUpdateData.avatar) {
      const uploaded = await uploadBase64Image(safeUpdateData.avatar, 'avatars');
      safeUpdateData.avatar = uploaded.url;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      safeUpdateData,
      { new: true, runValidators: true }
    );

    return user;
  }

  // Change password
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw new Error(Messages.USER.NOT_FOUND);
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      throw new Error(Messages.AUTH.CURRENT_PASSWORD_INCORRECT);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return true;
  }

  // Request password reset (active accounts only; invited users should use their invite)
  static async requestPasswordReset(email: string): Promise<{ user: IUserDocument; resetToken: string } | null> {
    const user = await User.findOne({ email: email.toLowerCase().trim(), status: 'active' });

    if (!user) {
      // Don't reveal whether the email exists
      return null;
    }

    const { token: resetToken, hash } = generateOneTimeToken();
    user.passwordResetToken = hash;
    user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    return { user, resetToken };
  }

  // Reset password with token
  static async resetPassword(resetToken: string, newPassword: string): Promise<IUserDocument> {
    const user = await User.findOne({
      passwordResetToken: hashToken(resetToken),
      passwordResetExpires: { $gt: new Date() }
    }).select('+password');

    if (!user) {
      throw new ApiError(400, Messages.AUTH.INVALID_RESET_TOKEN);
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return user;
  }
}
