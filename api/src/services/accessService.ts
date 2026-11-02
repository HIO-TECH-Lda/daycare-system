import mongoose, { Types } from 'mongoose';
import { Request } from 'express';
import Child from '../models/Child';
import StaffAssignment from '../models/StaffAssignment';
import Invoice from '../models/Invoice';
import { ApiError } from '../utils/ApiError';

/**
 * Who can see what:
 * - administrador: everything
 * - staff: the children in the classes they are assigned to (none if unassigned)
 * - responsavel: their own children
 *
 * Records that belong to a child (attendance, reports, photos, guardians, pickup persons) follow the child.
 * Out-of-scope records answer 404, so their existence isn't revealed.
 */
export interface AccessScope {
  role: string;
  userId: string;
  /** True for admins: no filtering */
  all: boolean;
  childIds: Types.ObjectId[];
  classIds: Types.ObjectId[];
}

const NOT_FOUND = 'Registo não encontrado';

const scopeCache = new WeakMap<Request, Promise<AccessScope>>();

function toId(value: unknown): string | undefined {
  if (!value) return undefined;
  const v = value as { _id?: unknown };
  return (v._id ?? value).toString();
}

export class AccessService {
  /** The requesting user's scope, computed once per request. */
  static scopeFor(req: Request): Promise<AccessScope> {
    let scope = scopeCache.get(req);
    if (!scope) {
      scope = this.computeScope(req.user!.role, req.user!.userId);
      scopeCache.set(req, scope);
    }
    return scope;
  }

  static async computeScope(role: string, userId: string): Promise<AccessScope> {
    if (role === 'administrador') {
      return { role, userId, all: true, childIds: [], classIds: [] };
    }

    if (role === 'staff') {
      const assignments = await StaffAssignment.find({ staff_id: new mongoose.Types.ObjectId(userId) }).select('class_id').lean();
      const classIds = assignments.map((a) => a.class_id as Types.ObjectId);
      const children = await Child.find({ class_id: { $in: classIds } }).select('_id').lean();
      return { role, userId, all: false, childIds: children.map((c) => c._id as Types.ObjectId), classIds };
    }

    const children = await Child.find({ parent_id: new mongoose.Types.ObjectId(userId) }).select('_id class_id').lean();
    return {
      role,
      userId,
      all: false,
      childIds: children.map((c) => c._id as Types.ObjectId),
      classIds: [...new Map(children.map((c) => [c.class_id.toString(), c.class_id as Types.ObjectId])).values()]
    };
  }

  /** Mongo filter limiting a query to the children in scope (empty for admins). */
  static childFilter(scope: AccessScope, field = 'child_id'): Record<string, unknown> {
    return scope.all ? {} : { [field]: { $in: scope.childIds } };
  }

  static canSeeChild(scope: AccessScope, childId: unknown): boolean {
    const id = toId(childId);
    return scope.all || (!!id && scope.childIds.some((c) => c.toString() === id));
  }

  static canSeeClass(scope: AccessScope, classId: unknown): boolean {
    const id = toId(classId);
    return scope.all || (!!id && scope.classIds.some((c) => c.toString() === id));
  }

  /** Throws 404 unless the child (an id or a populated document) is in scope. */
  static assertChild(scope: AccessScope, childId: unknown): void {
    if (!this.canSeeChild(scope, childId)) throw new ApiError(404, NOT_FOUND);
  }

  /** Throws 404 when the record is missing or belongs to a child out of scope; returns the record. */
  static assertRecord<T extends { child_id?: unknown }>(scope: AccessScope, record: T | null | undefined): T {
    if (!record || !this.canSeeChild(scope, record.child_id)) throw new ApiError(404, NOT_FOUND);
    return record;
  }

  /** Invoices the user may see: all for admins, their own for parents, none for staff. */
  static async invoiceIds(scope: AccessScope): Promise<Types.ObjectId[] | 'all'> {
    if (scope.all) return 'all';
    if (scope.role !== 'responsavel') return [];
    const invoices = await Invoice.find({ parent_id: new mongoose.Types.ObjectId(scope.userId) }).select('_id').lean();
    return invoices.map((i) => i._id as Types.ObjectId);
  }

  /** Parents of the children in scope (for staff picking message recipients, etc.). */
  static async parentIds(scope: AccessScope): Promise<Types.ObjectId[]> {
    const children = await Child.find({ _id: { $in: scope.childIds } }).select('parent_id').lean();
    return children.map((c) => c.parent_id as Types.ObjectId);
  }
}
