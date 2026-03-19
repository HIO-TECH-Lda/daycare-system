import { Request } from 'express';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Extract pagination parameters from request query
 * @param req Express request
 * @param defaultLimit Default limit if not provided (default: 20)
 * @param maxLimit Maximum allowed limit (default: 100)
 * @returns Pagination options
 */
export function getPaginationParams(
  req: Request,
  defaultLimit = 20,
  maxLimit = 100
): PaginationOptions {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  let limit = parseInt(req.query.limit as string) || defaultLimit;
  
  // Enforce maximum limit
  if (limit > maxLimit) {
    limit = maxLimit;
  }
  
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Create pagination result from data and total count
 */
export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  return {
    data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
}
