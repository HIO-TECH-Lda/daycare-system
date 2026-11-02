import User, { IUserDocument } from '../models/User';
import { AuthService } from '../services/authService';
import { UserRole, UserStatus } from '../types';

export const TEST_PASSWORD = 'Test@1234';

let counter = 0;

/** Creates a user directly in the database (bypassing invites), with a password. */
export async function createUser(
  role: UserRole = 'responsavel',
  overrides: Partial<{
    email: string | null;
    phone: string;
    status: UserStatus;
    firstName: string;
    lastName: string;
    whatsappOptIn: boolean;
  }> = {}
): Promise<IUserDocument> {
  counter += 1;
  return User.create({
    firstName: 'Teste',
    lastName: `Utilizador${counter}`,
    email: `user${counter}@example.com`,
    password: TEST_PASSWORD,
    role,
    ...overrides
  });
}

/** Authorization header value for a user. */
export function bearer(user: IUserDocument): string {
  return `Bearer ${AuthService.generateToken(user)}`;
}

/** Extracts the raw invite token from an invite link returned by the API. */
export function tokenFromInviteLink(link: string): string {
  return link.split('/convite/')[1];
}

/** Extracts the raw token from a password-reset link. */
export function tokenFromResetLink(link: string): string {
  return new URL(link).searchParams.get('token')!;
}
