// User (daycare system)
export type UserRole = 'responsavel' | 'staff' | 'administrador';

export type UserStatus = 'invited' | 'active' | 'inactive' | 'suspended';

export interface IUser {
  _id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  password: string;
  role: UserRole;
  phone?: string;
  status: UserStatus;
  emailVerified?: boolean;
  avatar?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  inviteTokenHash?: string;
  inviteExpires?: Date;
  invitedBy?: unknown;
  invitedAt?: Date;
  activatedAt?: Date;
  whatsappOptIn?: boolean;
  whatsappOptInAt?: Date;
  tokenVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// API response shape
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// JWT payload (set by auth middleware)
export interface JWTPayload {
  userId: string;
  email?: string;
  role: string;
  firstName: string;
  lastName: string;
  /** Token version: must match the user's tokenVersion (see User model) */
  tv: number;
  /** Access tokens authenticate requests; refresh tokens only work on /auth/refresh */
  typ: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// Express Request with user (after authenticateToken)
import { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}
