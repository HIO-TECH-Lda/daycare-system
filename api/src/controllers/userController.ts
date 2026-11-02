import { Request, Response } from 'express';
import { UserService, formatUserForAdmin } from '../services/userService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import Messages from '../utils/messages';
import { UserStatus } from '../types';

const STATUS_FILTERS = ['invited', 'active', 'inactive', 'suspended', 'all'];

export class UserController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;
    // Only admins may list non-active users; staff always see active users
    const requested = req.query.status as string | undefined;
    const status = (req.user!.role === 'administrador' && requested && STATUS_FILTERS.includes(requested)
      ? requested
      : 'active') as UserStatus | 'all';
    const { page, limit } = getPaginationParams(req);
    const { users, total } = await UserService.findAll(role, search, page, limit, status);
    return res.json(ApiResponse.paginated(users, { page, limit, total }, 'Usuários recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const user = await UserService.findById(req.params.id);
    return res.json(ApiResponse.success(formatUserForAdmin(user), Messages.USER.RETRIEVED));
  });

  // `delivery` says which channels the invite went out on; when both are false the admin
  // must share `inviteLink` by hand (e.g. from the centre's own phone)
  static create = catchAsync(async (req: Request, res: Response) => {
    const { user, inviteLink, delivery } = await UserService.createInvited(req.body, req.user!.userId);
    return res.status(201).json(ApiResponse.success({ user: formatUserForAdmin(user), inviteLink, delivery }, Messages.INVITE.SENT));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const user = await UserService.update(req.params.id, req.body, req.user!.userId);
    return res.json(ApiResponse.success(formatUserForAdmin(user), Messages.USER.UPDATED));
  });

  static setStatus = catchAsync(async (req: Request, res: Response) => {
    const user = await UserService.setStatus(req.params.id, req.body.status, req.user!.userId);
    return res.json(ApiResponse.success(formatUserForAdmin(user), Messages.USER.STATUS_UPDATED));
  });

  static resendInvite = catchAsync(async (req: Request, res: Response) => {
    const { user, inviteLink, delivery } = await UserService.resendInvite(req.params.id);
    return res.json(ApiResponse.success({ user: formatUserForAdmin(user), inviteLink, delivery }, Messages.INVITE.RESENT));
  });

  // For users who forgot their password and can't receive the link themselves
  static createPasswordResetLink = catchAsync(async (req: Request, res: Response) => {
    const { user, resetLink, delivery } = await UserService.createPasswordResetLink(req.params.id);
    return res.json(ApiResponse.success({ user: formatUserForAdmin(user), resetLink, delivery }, Messages.USER.RESET_LINK_CREATED));
  });
}
