import { Request, Response } from 'express';
import { ChildService } from '../services/childService';
import { StaffAssignmentService } from '../services/staffAssignmentService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class ChildController {
  // Get all children (with role-based filtering)
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const userRole = req.user?.role || '';
    const userId = req.user?.userId || '';
    const { page, limit } = getPaginationParams(req);
    
    let assignedClassIds: string[] | undefined;
    if (userRole === 'staff') {
      assignedClassIds = await StaffAssignmentService.getAssignedClassIds(userId);
    }
    
    const { children, total } = await ChildService.findAll(userRole, userId, assignedClassIds, page, limit);
    res.json(ApiResponse.paginated(children, { page, limit, total }, 'Crianças recuperadas com sucesso'));
  });

  // Get child by ID (with access check)
  static getById = catchAsync(async (req: Request, res: Response) => {
    const userRole = req.user?.role || '';
    const userId = req.user?.userId || '';
    
    let assignedClassIds: string[] | undefined;
    if (userRole === 'staff') {
      assignedClassIds = await StaffAssignmentService.getAssignedClassIds(userId);
    }
    
    const child = await ChildService.findById(req.params.id, userRole, userId, assignedClassIds);
    
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Criança não encontrada ou você não tem permissão para acessá-la'
      });
    }

    res.json(ApiResponse.success(child, 'Criança recuperada com sucesso'));
  });

  // Create child
  static create = catchAsync(async (req: Request, res: Response) => {
    const child = await ChildService.create(req.body);
    res.status(201).json(ApiResponse.success(child, 'Criança criada com sucesso', 201));
  });

  // Update child
  static update = catchAsync(async (req: Request, res: Response) => {
    const child = await ChildService.update(req.params.id, req.body);
    
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Criança não encontrada'
      });
    }

    res.json(ApiResponse.success(child, 'Criança atualizada com sucesso'));
  });

  // Delete child
  static delete = catchAsync(async (req: Request, res: Response) => {
    const child = await ChildService.delete(req.params.id);
    
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Criança não encontrada'
      });
    }

    res.json(ApiResponse.success(null, 'Criança excluída com sucesso'));
  });
}
