import { Request, Response } from 'express';
import { ExpenseService } from '../services/expenseService';
import { CloudinaryService } from '../services/cloudinaryService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class ExpenseController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const categoryId = req.query.category_id as string | undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const { expenses, total } = await ExpenseService.findAll(categoryId, startDate, endDate, page, limit);
    res.json(ApiResponse.paginated(expenses, { page, limit, total }, 'Despesas recuperadas com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const expense = await ExpenseService.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Despesa não encontrada' });
    }
    return res.json(ApiResponse.success(expense, 'Despesa recuperada com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    if ((req as any).file) {
      const file = (req as any).file as Express.Multer.File;
      const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
      const { url } = await CloudinaryService.upload(file.buffer, 'receipts', { resourceType });
      req.body.receipt_url = url;
    }
    const expense = await ExpenseService.create({
      ...req.body,
      recorded_by: req.user!.userId
    });
    return res.status(201).json(ApiResponse.success(expense, 'Despesa registrada com sucesso', 201));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    if ((req as any).file) {
      const file = (req as any).file as Express.Multer.File;
      const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
      const { url } = await CloudinaryService.upload(file.buffer, 'receipts', { resourceType });
      req.body.receipt_url = url;
    }
    const expense = await ExpenseService.update(req.params.id, req.body);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Despesa não encontrada' });
    }
    return res.json(ApiResponse.success(expense, 'Despesa atualizada com sucesso'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const expense = await ExpenseService.delete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Despesa não encontrada' });
    }
    return res.json(ApiResponse.success(null, 'Despesa excluída com sucesso'));
  });
}
