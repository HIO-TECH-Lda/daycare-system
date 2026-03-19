import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class UserController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;
    const { page, limit } = getPaginationParams(req);
    const { users, total } = await UserService.findAll(role, search, page, limit);
    res.json(ApiResponse.paginated(users, { page, limit, total }, 'Usuários recuperados com sucesso'));
  });
}
