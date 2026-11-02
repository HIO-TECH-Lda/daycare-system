import { Request } from 'express';
import { AccessScope, AccessService } from '../services/accessService';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';

/**
 * Route guards for records that belong to a child (see AccessService for the rules).
 * Out-of-scope records answer 404, like missing ones.
 */

/** The child given in the URL (e.g. /attendance/child/:childId) must be in scope. */
export const childParam = (param = 'childId') =>
  catchAsync(async (req, _res, next) => {
    AccessService.assertChild(await AccessService.scopeFor(req), req.params[param]);
    next();
  });

/** A child given in the body (create, or moving a record to another child) must be in scope. */
export const childInBody = (field = 'child_id') =>
  catchAsync(async (req, _res, next) => {
    if (req.body?.[field] !== undefined) {
      AccessService.assertChild(await AccessService.scopeFor(req), req.body[field]);
    }
    next();
  });

/**
 * The record named by :id must exist and belong to a child in scope.
 * `childOf` loads the record's child id (or null when the record doesn't exist or must stay hidden).
 */
export const recordAccess = (childOf: (id: string, scope: AccessScope, req: Request) => Promise<unknown>) =>
  catchAsync(async (req, _res, next) => {
    const scope = await AccessService.scopeFor(req);
    const childId = await childOf(req.params.id, scope, req);
    if (!childId) throw new ApiError(404, 'Registo não encontrado');
    AccessService.assertChild(scope, childId);
    next();
  });
