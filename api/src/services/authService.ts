import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { IUserDocument } from '../models/User';
import { JWTPayload } from '../types';
import Messages from '../utils/messages';
import { uploadBase64Image } from '../utils/cloudinary';

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

  // Verify user credentials
  static async verifyCredentials(email: string, password: string): Promise<IUserDocument | null> {
    try {
      // Find user by email and include password for comparison
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        return null;
      }

      // Check if user is active
      if (user.status !== 'active') {
        return null;
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      return null;
    }
  }

  // Register new user — returns both access and refresh tokens
  static async registerUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
  }): Promise<{ user: IUserDocument; token: string; refreshToken: string }> {
    const existingUser = await User.findOne({ email: userData.email });

    if (existingUser) {
      throw new Error(Messages.AUTH.EMAIL_ALREADY_EXISTS);
    }

    const user = new User({
      ...userData,
      role: userData.role || 'responsavel',
      phone: userData.phone || ''
    });

    await user.save();

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user, token, refreshToken };
  }

  // Login user
  static async loginUser(email: string, password: string): Promise<{ user: IUserDocument; token: string; refreshToken: string }> {
    const user = await this.verifyCredentials(email, password);
    
    if (!user) {
      throw new Error(Messages.AUTH.INVALID_CREDENTIALS);
    }

    // Generate tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user, token, refreshToken };
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

  // Request password reset
  static async requestPasswordReset(email: string): Promise<{ user: IUserDocument; resetToken: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if email exists for security
      throw new Error('If the email exists, a reset link will be sent');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save hashed token and expiry
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    return { user, resetToken };
  }

  // Reset password with token
  static async resetPassword(resetToken: string, newPassword: string): Promise<IUserDocument> {
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: new Date() }
    }).select('+password');

    if (!user) {
      throw new Error(Messages.AUTH.INVALID_RESET_TOKEN);
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return user;
  }
}
