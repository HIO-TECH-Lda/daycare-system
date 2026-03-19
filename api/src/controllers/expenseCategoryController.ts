import { Request, Response } from 'express';
import { ExpenseCategoryService } from '../services/expenseCategoryService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class ExpenseCategoryController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const activeOnly = req.query.active_only === 'true';
    const { page, limit } = getPaginationParams(req);
    const { categories, total } = await ExpenseCategoryService.findAll(activeOnly, page, limit);
    res.json(ApiResponse.paginated(categories, { page, limit, total }, 'Categorias de despesas recuperadas com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const category = await ExpenseCategoryService.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }
    return res.json(ApiResponse.success(category, 'Categoria recuperada com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const category = await ExpenseCategoryService.create(req.body);
    res.status(201).json(ApiResponse.success(category, 'Categoria criada com sucesso', 201));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const category = await ExpenseCategoryService.update(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }
    return res.json(ApiResponse.success(category, 'Categoria atualizada com sucesso'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const category = await ExpenseCategoryService.delete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }
    return res.json(ApiResponse.success(null, 'Categoria excluída com sucesso'));
  });
}
