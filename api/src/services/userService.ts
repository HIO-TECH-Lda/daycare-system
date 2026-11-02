import User, { IUserDocument } from '../models/User';
import { UserRole, UserStatus } from '../types';
import { ApiError } from '../utils/ApiError';
import Messages from '../utils/messages';
import { generateOneTimeToken } from '../utils/tokens';
import { NotificationService } from './notificationService';

export const INVITE_EXPIRY_DAYS = 7;

/** Admin view of a user (no secrets). */
export function formatUserForAdmin(user: IUserDocument) {
  return {
    id: (user._id as any).toString(),
    name: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    status: user.status,
    invitedAt: user.invitedAt ?? null,
    activatedAt: user.activatedAt ?? null,
    whatsappOptIn: !!user.whatsappOptIn,
    createdAt: (user as any).createdAt ?? null
  };
}

export class UserService {
  static async findAll(
    role?: string,
    search?: string,
    page = 1,
    limit = 50,
    status: UserStatus | 'all' = 'active'
  ): Promise<{ users: Array<{ id: string; name: string; email: string; phone: string; role: string; status: string }>; total: number }> {
    const query: any = {};
    if (status !== 'all') query.status = status;
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [rawUsers, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName email phone role status')
        .sort({ firstName: 1, lastName: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    const users = rawUsers.map((u) => ({
      id: (u._id as any).toString(),
      name: u.fullName,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      status: u.status
    }));

    return { users, total };
  }

  static async findById(id: string): Promise<IUserDocument> {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, Messages.USER.NOT_FOUND);
    return user;
  }

  private static async assertEmailFree(email: string, exceptId?: string): Promise<void> {
    const existing = await User.findOne({ email: email.toLowerCase() }).select('_id');
    if (existing && (existing._id as any).toString() !== exceptId) {
      throw new ApiError(409, Messages.AUTH.EMAIL_ALREADY_EXISTS);
    }
  }

  /** Generates a fresh invite token on the user (replacing any previous one). Caller saves. */
  private static issueInvite(user: IUserDocument): string {
    const { token, hash } = generateOneTimeToken();
    user.inviteTokenHash = hash;
    user.inviteExpires = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    user.invitedAt = new Date();
    return token;
  }

  private static async sendInvite(user: IUserDocument, inviteToken: string): Promise<void> {
    await NotificationService.invite({
      email: user.email,
      phone: user.phone,
      name: user.firstName,
      role: user.role,
      inviteToken,
      expiryDays: INVITE_EXPIRY_DAYS
    });
  }

  /**
   * Creates an invited user (no password) and sends the invite by email/WhatsApp.
   * Returns the invite link so the admin can also share it by hand.
   */
  static async createInvited(
    data: { firstName: string; lastName: string; email: string; role: UserRole; phone?: string },
    invitedBy?: string
  ): Promise<{ user: IUserDocument; inviteLink: string }> {
    await this.assertEmailFree(data.email);

    const user = new User({ ...data, phone: data.phone || '', status: 'invited' });
    // The very first admin (create-admin script) has no inviter, so records itself
    user.invitedBy = invitedBy ?? user._id;
    const inviteToken = this.issueInvite(user);
    await user.save();
    await this.sendInvite(user, inviteToken);

    return { user, inviteLink: NotificationService.inviteLink(inviteToken) };
  }

  static async resendInvite(id: string): Promise<{ user: IUserDocument; inviteLink: string }> {
    const user = await this.findById(id);
    if (user.status !== 'invited') throw new ApiError(409, Messages.INVITE.NOT_PENDING);

    const inviteToken = this.issueInvite(user);
    await user.save();
    await this.sendInvite(user, inviteToken);

    return { user, inviteLink: NotificationService.inviteLink(inviteToken) };
  }

  static async update(
    id: string,
    data: Partial<{ firstName: string; lastName: string; email: string; role: UserRole; phone: string }>,
    actingUserId: string
  ): Promise<IUserDocument> {
    const user = await this.findById(id);

    if (data.role && data.role !== user.role && id === actingUserId) {
      throw new ApiError(400, Messages.USER.CANNOT_CHANGE_OWN_ROLE);
    }
    if (data.email && data.email !== user.email) {
      await this.assertEmailFree(data.email, id);
    }

    Object.assign(user, data);
    await user.save();
    return user;
  }

  static async setStatus(id: string, status: Exclude<UserStatus, 'invited'>, actingUserId: string): Promise<IUserDocument> {
    if (id === actingUserId) throw new ApiError(400, Messages.USER.CANNOT_CHANGE_OWN_STATUS);

    const user = await this.findById(id);
    if (user.status === 'invited' && status === 'active') {
      throw new ApiError(409, Messages.USER.INVITED_CANNOT_BE_ACTIVATED);
    }

    user.status = status;
    await user.save();
    return user;
  }
}
