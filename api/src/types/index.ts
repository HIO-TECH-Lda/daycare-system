// User (daycare system)
export type UserRole = 'responsavel' | 'staff' | 'administrador';

export interface IUser {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  emailVerified?: boolean;
  avatar?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
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
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

// Express Request with user (after authenticateToken)
import { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}
