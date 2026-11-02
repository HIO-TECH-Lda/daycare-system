import User, { IUserDocument } from '../models/User';
import { UserRole, UserStatus } from '../types';
import { ApiError } from '../utils/ApiError';
import Messages from '../utils/messages';
import { generateOneTimeToken } from '../utils/tokens';
import { Delivery, NotificationService } from './notificationService';
import { AuthService, assertEmailFree, assertPhoneFree, setWhatsAppConsent } from './authService';

export const INVITE_EXPIRY_DAYS = 7;

/** Admin view of a user (no secrets). */
export function formatUserForAdmin(user: IUserDocument) {
  return {
    id: (user._id as any).toString(),
    name: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
    status: user.status,
    invitedAt: user.invitedAt ?? null,
    activatedAt: user.activatedAt ?? null,
    whatsappOptIn: !!user.whatsappOptIn,
    whatsappOptInAt: user.whatsappOptInAt ?? null,
    createdAt: (user as any).createdAt ?? null
  };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether the user ever set a password (i.e. accepted their invite). */
async function hasPassword(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select('+password');
  return !!user?.password;
}

type ContactFields = { email?: string; phone?: string; whatsappOptIn?: boolean };

export class UserService {
  static async findAll(
    role?: string,
    search?: string,
    page = 1,
    limit = 50,
    status: UserStatus | 'all' = 'active',
    /** Extra condition limiting which users the caller may see */
    visible?: Record<string, unknown>
  ): Promise<{ users: Array<{ id: string; name: string; email: string; phone: string; role: string; status: string }>; total: number }> {
    const query: any = visible ? { $and: [visible] } : {};
    if (status !== 'all') query.status = status;
    if (role) query.role = role;
    if (search) {
      const pattern = escapeRegExp(search.trim());
      const digits = search.replace(/\D/g, '');
      query.$or = [
        { firstName: { $regex: pattern, $options: 'i' } },
        { lastName: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } },
        ...(digits.length >= 3 ? [{ phone: { $regex: escapeRegExp(digits) } }] : [])
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
      email: u.email || '',
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

  /** Puts a fresh invite on the user (replacing any previous link) without saving; returns the raw token. */
  static prepareInvite(user: IUserDocument): string {
    const { token, hash } = generateOneTimeToken();
    user.status = 'invited';
    user.inviteTokenHash = hash;
    user.inviteExpires = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    user.invitedAt = new Date();
    return token;
  }

  /** Gives the user a fresh invite (replacing any previous link) and sends it on every channel they can receive. */
  static async reissueInvite(user: IUserDocument): Promise<{ inviteLink: string; delivery: Delivery }> {
    const token = this.prepareInvite(user);
    await user.save();
    return this.sendInvite(user, token);
  }

  /** Sends an invite prepared with prepareInvite() (after it was saved). */
  static async sendInvite(user: IUserDocument, token: string): Promise<{ inviteLink: string; delivery: Delivery }> {
    const delivery = await NotificationService.invite({
      email: user.email,
      whatsappPhone: NotificationService.whatsAppNumberFor(user),
      name: user.firstName,
      role: user.role,
      inviteToken: token,
      expiryDays: INVITE_EXPIRY_DAYS
    });

    return { inviteLink: NotificationService.inviteLink(token), delivery };
  }

  /**
   * Creates an invited user (no password) with an email, a phone number, or both, and sends the
   * invite by email and/or WhatsApp. WhatsApp is only used when `whatsappOptIn` records that the
   * person agreed to it (e.g. on the enrolment form). The link is also returned so the admin can
   * share it by hand when neither channel reaches the person.
   */
  static async createInvited(
    data: { firstName: string; lastName: string; role: UserRole } & ContactFields,
    invitedBy?: string
  ): Promise<{ user: IUserDocument; inviteLink: string; delivery: Delivery }> {
    await assertEmailFree(data.email);
    await assertPhoneFree(data.phone);

    const { whatsappOptIn, ...fields } = data;
    const user = new User({ ...fields, status: 'invited' });
    // The very first admin (create-admin script) has no inviter, so records itself
    user.invitedBy = invitedBy ?? user._id;
    setWhatsAppConsent(user, !!whatsappOptIn);

    const { inviteLink, delivery } = await this.reissueInvite(user);
    return { user, inviteLink, delivery };
  }

  /** Re-invite someone who never activated their account (status invited, or deactivated before activating). */
  static async resendInvite(id: string): Promise<{ user: IUserDocument; inviteLink: string; delivery: Delivery }> {
    const user = await this.findById(id);
    if (await hasPassword(id)) throw new ApiError(409, Messages.INVITE.NOT_PENDING);

    const { inviteLink, delivery } = await this.reissueInvite(user);
    return { user, inviteLink, delivery };
  }

  /** Admin-generated password-reset link, sent on the user's channels and returned to share by hand. */
  static async createPasswordResetLink(id: string): Promise<{ user: IUserDocument; resetLink: string; delivery: Delivery }> {
    const user = await this.findById(id);
    if (user.status !== 'active') throw new ApiError(409, Messages.USER.RESET_NEEDS_ACTIVE);

    const resetToken = await AuthService.issuePasswordReset(user);
    const delivery = await NotificationService.passwordReset({
      email: user.email,
      whatsappPhone: NotificationService.whatsAppNumberFor(user),
      name: user.firstName,
      resetToken
    });

    return { user, resetLink: NotificationService.passwordResetLink(resetToken), delivery };
  }

  static async update(
    id: string,
    data: Partial<{ firstName: string; lastName: string; role: UserRole } & ContactFields>,
    actingUserId: string
  ): Promise<IUserDocument> {
    const user = await this.findById(id);

    if (data.role && data.role !== user.role && id === actingUserId) {
      throw new ApiError(400, Messages.USER.CANNOT_CHANGE_OWN_ROLE);
    }
    await assertEmailFree(data.email, id);
    await assertPhoneFree(data.phone, id);

    const { whatsappOptIn, ...fields } = data;
    Object.assign(user, fields);
    if (typeof whatsappOptIn === 'boolean') setWhatsAppConsent(user, whatsappOptIn);
    await user.save();
    return user;
  }

  static async setStatus(id: string, status: Exclude<UserStatus, 'invited'>, actingUserId: string): Promise<IUserDocument> {
    if (id === actingUserId) throw new ApiError(400, Messages.USER.CANNOT_CHANGE_OWN_STATUS);

    const user = await this.findById(id);
    // Someone who never set a password can only become active by accepting an invite
    if (status === 'active' && !(await hasPassword(id))) {
      throw new ApiError(409, Messages.USER.INVITED_CANNOT_BE_ACTIVATED);
    }

    user.status = status;
    if (status !== 'active') {
      // A deactivated invitee's link stops working; re-inviting issues a new one
      user.inviteTokenHash = undefined;
      user.inviteExpires = undefined;
    }
    await user.save();
    return user;
  }
}
