import jwt from 'jsonwebtoken';
import User, { IUserDocument } from '../models/User';
import { JWTPayload } from '../types';
import Messages from '../utils/messages';
import { uploadBase64Image } from '../utils/cloudinary';
import { ApiError } from '../utils/ApiError';
import { generateOneTimeToken, hashToken } from '../utils/tokens';
import { isEmailIdentifier, normalisePhone } from '../utils/phone';

const RESET_TOKEN_HOURS = 24;

// Format user for frontend (matches frontend User type)
export function formatUserForFrontend(user: IUserDocument) {
  return {
    id: (user._id as any).toString(),
    email: user.email || '',
    name: user.fullName,
    role: user.role,
    phone: user.phone || '',
    whatsappOptIn: !!user.whatsappOptIn
  };
}

/**
 * Database filter for what the user typed to identify themselves: an email address
 * or a phone number in any common format. Null when it can be neither.
 */
export function identifierFilter(identifier: string): { email: string } | { phone: string } | null {
  const value = (identifier || '').trim();
  if (!value) return null;
  if (isEmailIdentifier(value)) return { email: value.toLowerCase() };
  const phone = normalisePhone(value);
  return phone ? { phone } : null;
}

function refreshSecret(): string {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
}

export class AuthService {
  private static payload(user: IUserDocument, typ: JWTPayload['typ']): JWTPayload {
    return {
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      tv: user.tokenVersion ?? 0,
      typ
    };
  }

  // Generate JWT access token
  static generateToken(user: IUserDocument): string {
    return jwt.sign(this.payload(user, 'access'), process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as jwt.SignOptions);
  }

  // Generate refresh token — signed with JWT_REFRESH_SECRET and typed, so it can't be used as an access token
  static generateRefreshToken(user: IUserDocument): string {
    return jwt.sign(this.payload(user, 'refresh'), refreshSecret(), {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    } as jwt.SignOptions);
  }

  static issueTokens(user: IUserDocument): { token: string; refreshToken: string } {
    return { token: this.generateToken(user), refreshToken: this.generateRefreshToken(user) };
  }

  // Verify credentials (email or phone + password). Returns null for an unknown identifier or wrong
  // password; throws ApiError(401) when the password is right but the account is not active.
  static async verifyCredentials(identifier: string, password: string): Promise<IUserDocument | null> {
    const filter = identifierFilter(identifier);
    if (!filter) return null;

    const user = await User.findOne(filter).select('+password');
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
  static async loginUser(identifier: string, password: string): Promise<{ user: IUserDocument; token: string; refreshToken: string }> {
    const user = await this.verifyCredentials(identifier, password);

    if (!user) {
      throw new ApiError(401, Messages.AUTH.INVALID_CREDENTIALS);
    }

    return { user, ...this.issueTokens(user) };
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

  // Accept an invite: set the password, record the WhatsApp choice if given, activate and log in
  static async acceptInvite(
    inviteToken: string,
    password: string,
    whatsappOptIn?: boolean
  ): Promise<{ user: IUserDocument; token: string; refreshToken: string }> {
    const user = await this.findPendingInvite(inviteToken);

    user.password = password;
    user.status = 'active';
    user.activatedAt = new Date();
    user.inviteTokenHash = undefined;
    user.inviteExpires = undefined;
    if (typeof whatsappOptIn === 'boolean') setWhatsAppConsent(user, whatsappOptIn);
    await user.save();

    return { user, ...this.issueTokens(user) };
  }

  // Refresh: only refresh tokens, only for active accounts, only if not revoked since they were issued
  static async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret()) as JWTPayload;
    } catch {
      throw new ApiError(401, Messages.AUTH.INVALID_REFRESH_TOKEN);
    }

    const user = decoded.typ === 'refresh' ? await User.findById(decoded.userId) : null;
    if (!user || user.status !== 'active' || (user.tokenVersion ?? 0) !== decoded.tv) {
      throw new ApiError(401, Messages.AUTH.INVALID_REFRESH_TOKEN);
    }

    return this.issueTokens(user);
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<IUserDocument | null> {
    return User.findById(userId);
  }

  // Update own profile: only these fields; email and role are managed by admins
  static async updateUserProfile(
    userId: string,
    updateData: Partial<{ firstName: string; lastName: string; phone: string; avatar: string; whatsappOptIn: boolean }>
  ): Promise<IUserDocument | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    const { firstName, lastName, phone, avatar, whatsappOptIn } = updateData;

    if (phone !== undefined) {
      await assertPhoneFree(phone, userId);
      user.phone = phone;
    }
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (avatar) {
      // Base64 data or a URL: store the Cloudinary URL
      user.avatar = avatar.startsWith('http') ? avatar : (await uploadBase64Image(avatar, 'avatars')).url;
    }
    if (typeof whatsappOptIn === 'boolean') setWhatsAppConsent(user, whatsappOptIn);

    await user.save();
    return user;
  }

  // Change password. Ends every other session; returns fresh tokens for the current one.
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ token: string; refreshToken: string }> {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new ApiError(404, Messages.USER.NOT_FOUND);
    }

    if (!(await user.comparePassword(currentPassword))) {
      throw new ApiError(400, Messages.AUTH.CURRENT_PASSWORD_INCORRECT);
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    return this.issueTokens(user);
  }

  /** Puts a fresh password-reset token on the user (valid 24 h) and returns it. */
  static async issuePasswordReset(user: IUserDocument): Promise<string> {
    const { token, hash } = generateOneTimeToken();
    user.passwordResetToken = hash;
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);
    await user.save();
    return token;
  }

  /**
   * "Forgot password" lookup. Active users get a reset token; invited users haven't set a
   * password yet, so the caller re-sends their invite instead. Null for anyone else.
   */
  static async requestPasswordReset(identifier: string): Promise<
    { kind: 'reset'; user: IUserDocument; resetToken: string } | { kind: 'invite'; user: IUserDocument } | null
  > {
    const filter = identifierFilter(identifier);
    const user = filter ? await User.findOne(filter) : null;

    if (user?.status === 'active') {
      return { kind: 'reset', user, resetToken: await this.issuePasswordReset(user) };
    }
    if (user?.status === 'invited') {
      return { kind: 'invite', user };
    }
    return null;
  }

  // Reset password with token. Ends every existing session.
  static async resetPassword(resetToken: string, newPassword: string): Promise<IUserDocument> {
    const user = await User.findOne({
      passwordResetToken: hashToken(resetToken),
      passwordResetExpires: { $gt: new Date() }
    }).select('+password');

    if (!user) {
      throw new ApiError(400, Messages.AUTH.INVALID_RESET_TOKEN);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    return user;
  }
}

/** Records the user's WhatsApp consent (or its withdrawal) with a timestamp. */
export function setWhatsAppConsent(user: IUserDocument, optIn: boolean): void {
  if (optIn && !user.whatsappOptIn) user.whatsappOptInAt = new Date();
  if (!optIn) user.whatsappOptInAt = undefined;
  user.whatsappOptIn = optIn;
}

/** 409 when another user already has this phone number. Empty input (clearing the phone) is fine. */
export async function assertPhoneFree(phone: string | undefined, exceptUserId?: string): Promise<void> {
  const normalised = normalisePhone(phone);
  if (!normalised) return;
  const existing = await User.findOne({ phone: normalised }).select('_id');
  if (existing && (existing._id as any).toString() !== exceptUserId) {
    throw new ApiError(409, Messages.AUTH.PHONE_ALREADY_EXISTS);
  }
}

/** 409 when another user already has this email. */
export async function assertEmailFree(email: string | undefined, exceptUserId?: string): Promise<void> {
  const value = email?.trim().toLowerCase();
  if (!value) return;
  const existing = await User.findOne({ email: value }).select('_id');
  if (existing && (existing._id as any).toString() !== exceptUserId) {
    throw new ApiError(409, Messages.AUTH.EMAIL_ALREADY_EXISTS);
  }
}
