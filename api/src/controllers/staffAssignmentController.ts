import { Request, Response } from 'express';
import { StaffAssignmentService } from '../services/staffAssignmentService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class StaffAssignmentController {
  // Get all assignments (admin: all; staff: own only)
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const userRole = req.user?.role || '';
    const userId = req.user?.userId || '';
    const staffIdQuery = req.query.staff_id as string | undefined;
    const { page, limit } = getPaginationParams(req);

    let assignments, total;

    if (userRole === 'administrador') {
      // Admin can list all or filter by staff_id
      const result = await StaffAssignmentService.findAll(staffIdQuery, page, limit);
      assignments = result.assignments;
      total = result.total;
    } else if (userRole === 'staff') {
      // Staff sees only their own assignments
      const result = await StaffAssignmentService.findAll(userId, page, limit);
      assignments = result.assignments;
      total = result.total;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores e staff podem listar atribuições.'
      });
    }

    return res.json(ApiResponse.paginated(assignments, { page, limit, total }, 'Atribuições recuperadas com sucesso'));
  });

  // Get assignment by ID
  static getById = catchAsync(async (req: Request, res: Response) => {
    const assignment = await StaffAssignmentService.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Atribuição não encontrada'
      });
    }

    const userRole = req.user?.role || '';
    const userId = req.user?.userId || '';

    if (userRole === 'staff') {
      const staffId = (assignment.staff_id as any)?._id?.toString() ?? (assignment.staff_id as any).toString();
      if (staffId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Você só pode ver suas próprias atribuições.'
        });
      }
    }

    return res.json(ApiResponse.success(assignment, 'Atribuição recuperada com sucesso'));
  });

  // Create assignment (admin only)
  static create = catchAsync(async (req: Request, res: Response) => {
    const { staff_id, class_id } = req.body;
    const assignment = await StaffAssignmentService.create(staff_id, class_id);
    res.status(201).json(ApiResponse.success(assignment, 'Atribuição criada com sucesso', 201));
  });

  // Delete assignment (admin only)
  static delete = catchAsync(async (req: Request, res: Response) => {
    const assignment = await StaffAssignmentService.delete(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Atribuição não encontrada'
      });
    }

    return res.json(ApiResponse.success(null, 'Atribuição removida com sucesso'));
  });
}
