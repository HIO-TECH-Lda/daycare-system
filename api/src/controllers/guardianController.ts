import { Request, Response } from 'express';
import { GuardianService } from '../services/guardianService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import { AccessService } from '../services/accessService';

export class GuardianController {
  // Get all guardians (with optional child filter)
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const childId = req.query.child_id as string | undefined;
    const { page, limit } = getPaginationParams(req);
    const scope = await AccessService.scopeFor(req);
    if (childId) AccessService.assertChild(scope, childId);
    const { guardians, total } = await GuardianService.findAll(childId, page, limit, AccessService.childFilter(scope));
    res.json(ApiResponse.paginated(guardians, { page, limit, total }, 'Responsáveis recuperados com sucesso'));
  });

  // Get guardians for a specific child
  static getByChildId = catchAsync(async (req: Request, res: Response) => {
    const guardians = await GuardianService.findByChildId(req.params.childId);
    res.json(ApiResponse.success(guardians, 'Responsáveis recuperados com sucesso'));
  });

  // Get guardian by ID
  static getById = catchAsync(async (req: Request, res: Response) => {
    const guardian = await GuardianService.findById(req.params.id);
    
    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: 'Responsável não encontrado'
      });
    }

    return res.json(ApiResponse.success(guardian, 'Responsável recuperado com sucesso'));
  });

  // Create guardian
  static create = catchAsync(async (req: Request, res: Response) => {
    const guardian = await GuardianService.create(req.body);
    res.status(201).json(ApiResponse.success(guardian, 'Responsável criado com sucesso', 201));
  });

  // Update guardian
  static update = catchAsync(async (req: Request, res: Response) => {
    const guardian = await GuardianService.update(req.params.id, req.body);
    
    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: 'Responsável não encontrado'
      });
    }

    return res.json(ApiResponse.success(guardian, 'Responsável atualizado com sucesso'));
  });

  // Delete guardian
  static delete = catchAsync(async (req: Request, res: Response) => {
    const guardian = await GuardianService.delete(req.params.id);
    
    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: 'Responsável não encontrado'
      });
    }

    return res.json(ApiResponse.success(null, 'Responsável excluído com sucesso'));
  });
}
