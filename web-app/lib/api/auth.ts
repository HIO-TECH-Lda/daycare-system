import { api, publicApi, session } from './client';

export type Role = 'administrador' | 'staff' | 'responsavel';

/** The user as returned by the auth endpoints. */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  whatsappOptIn: boolean;
}

interface SessionPayload {
  user: User;
  token: string;
  refreshToken: string;
}

export interface Invite {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  whatsappOptIn: boolean;
}

export const authApi = {
  /** Log in with an email or a phone number. */
  async login(identifier: string, password: string): Promise<User> {
    const res = await publicApi.post<SessionPayload>('/auth/login', { identifier, password });
    session.set(res.data);
    return res.data.user;
  },

  async me(): Promise<User> {
    return (await api.get<{ user: User }>('/auth/me')).data.user;
  },

  async getInvite(token: string): Promise<Invite> {
    return (await publicApi.get<Invite>(`/auth/invite/${encodeURIComponent(token)}`)).data;
  },

  /** Sets the password, activates the account and logs the user in. */
  async acceptInvite(input: { token: string; password: string; confirmPassword: string; whatsappOptIn?: boolean }): Promise<User> {
    const res = await publicApi.post<SessionPayload>('/auth/accept-invite', input);
    session.set(res.data);
    return res.data.user;
  },

  /** Always resolves the same way, whether or not the account exists. */
  async forgotPassword(identifier: string): Promise<string> {
    return (await publicApi.post<null>('/auth/forgot-password', { identifier })).message;
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await publicApi.post<null>('/auth/reset-password', { token, newPassword, confirmNewPassword: newPassword });
  },

  /** Name, phone and WhatsApp consent (email and role are the administration's). */
  async updateProfile(input: { firstName: string; lastName: string; phone: string; whatsappOptIn: boolean }): Promise<User> {
    return (await api.put<{ user: User }>('/auth/me', input)).data.user;
  },

  /** Ends every other session; this one continues with the new tokens. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await api.put<{ token: string; refreshToken: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmNewPassword: newPassword
    });
    session.set(res.data);
  },

  logout(): void {
    session.clear();
  }
};
