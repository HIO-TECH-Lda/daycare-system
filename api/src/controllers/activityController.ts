import { Request, Response } from 'express';
import { ActivityService } from '../services/activityService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class ActivityController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const classId = req.query.class_id as string | undefined;
    const activeOnly = req.query.active_only === 'true';
    const { page, limit } = getPaginationParams(req);
    const { activities, total } = await ActivityService.findAll(classId, activeOnly, page, limit);
    res.json(ApiResponse.paginated(activities, { page, limit, total }, 'Atividades recuperadas com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const activity = await ActivityService.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Atividade não encontrada' });
    }
    res.json(ApiResponse.success(activity, 'Atividade recuperada com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const activity = await ActivityService.create(req.body);
    res.status(201).json(ApiResponse.success(activity, 'Atividade criada com sucesso', 201));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const activity = await ActivityService.update(req.params.id, req.body);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Atividade não encontrada' });
    }
    res.json(ApiResponse.success(activity, 'Atividade atualizada com sucesso'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const activity = await ActivityService.delete(req.params.id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Atividade não encontrada' });
    }
    res.json(ApiResponse.success(null, 'Atividade excluída com sucesso'));
  });
}
