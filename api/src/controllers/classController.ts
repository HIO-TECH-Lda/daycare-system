import { Request, Response } from 'express';
import { ClassService } from '../services/classService';
import Messages from '../utils/messages';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class ClassController {
  // Get all classes
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req);
    const { classes, total } = await ClassService.findAll(page, limit);
    res.json(ApiResponse.paginated(classes, { page, limit, total }, 'Turmas recuperadas com sucesso'));
  });

  // Get class by ID
  static getById = catchAsync(async (req: Request, res: Response) => {
    const classDoc = await ClassService.findById(req.params.id);
    
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Turma não encontrada'
      });
    }

    return res.json(ApiResponse.success(classDoc, 'Turma recuperada com sucesso'));
  });

  // Create class
  static create = catchAsync(async (req: Request, res: Response) => {
    const classDoc = await ClassService.create(req.body);
    res.status(201).json(ApiResponse.success(classDoc, Messages.USER.CREATED.replace('Usuário', 'Turma'), 201));
  });

  // Update class
  static update = catchAsync(async (req: Request, res: Response) => {
    const classDoc = await ClassService.update(req.params.id, req.body);
    
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Turma não encontrada'
      });
    }

    return res.json(ApiResponse.success(classDoc, Messages.USER.UPDATED.replace('Usuário', 'Turma')));
  });

  // Delete class
  static delete = catchAsync(async (req: Request, res: Response) => {
    const classDoc = await ClassService.delete(req.params.id);
    
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Turma não encontrada'
      });
    }

    return res.json(ApiResponse.success(null, 'Turma excluída com sucesso'));
  });
}
