import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';
import Messages from '../utils/messages';
import User from '../models/User';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Verify JWT token middleware. Also checks the account is still active, so deactivating
// a user (or changing their role) takes effect immediately instead of when the token expires.
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: Messages.AUTH.TOKEN_REQUIRED
    });
  }

  let decoded: JWTPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: Messages.AUTH.TOKEN_EXPIRED
      });
    }
    return res.status(403).json({
      success: false,
      message: Messages.AUTH.TOKEN_INVALID
    });
  }

  try {
    const account = await User.findById(decoded.userId).select('status role').lean();
    if (!account || account.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: Messages.AUTH.ACCOUNT_NOT_ACTIVE
      });
    }
    req.user = { ...decoded, role: account.role };
    return next();
  } catch (error) {
    return next(error);
  }
};

// Role-based authorization middleware
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: Messages.AUTH.AUTHENTICATION_REQUIRED
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: Messages.AUTH.INSUFFICIENT_PERMISSIONS
      });
    }

    return next();
  };
};

// Convenience middleware: daycare roles
export const requireAdmin = authorizeRoles('administrador');
export const requireStaff = authorizeRoles('staff', 'administrador');
export const requireResponsavel = authorizeRoles('responsavel', 'staff', 'administrador');

// Generic role checker (use authorizeRoles for multiple roles)
export const requireRole = (role: string) => authorizeRoles(role);

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      req.user = decoded;
    }
    return next();
  } catch (error) {
    // Continue without authentication
    return next();
  }
};
