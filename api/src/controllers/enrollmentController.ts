import { Request, Response } from 'express';
import { EnrollmentService } from '../services/enrollmentService';
import { EnrollmentStatus } from '../models/Enrollment';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

const STATUSES: EnrollmentStatus[] = ['submitted', 'under_review', 'approved', 'rejected'];

export class EnrollmentController {
  // Public (or an admin on a family's behalf). Answers only with the reference, never the data.
  static submit = catchAsync(async (req: Request, res: Response) => {
    const { website, ...data } = req.body;
    // Honeypot filled in: a bot. Answer as if it worked, store nothing.
    if (website) {
      const reference = `MAT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      return res.status(201).json(ApiResponse.success({ reference, status: 'submitted' }, 'Pedido de matrícula recebido'));
    }

    const submittedBy = req.user?.role === 'administrador' ? req.user.userId : undefined;
    const enrollment = await EnrollmentService.submit(data, submittedBy);
    return res.status(201).json(ApiResponse.success(
      { reference: enrollment.reference, status: enrollment.status },
      'Pedido de matrícula recebido'
    ));
  });

  static list = catchAsync(async (req: Request, res: Response) => {
    const status = STATUSES.includes(req.query.status as EnrollmentStatus) ? req.query.status as EnrollmentStatus : undefined;
    const { page, limit } = getPaginationParams(req);
    const { enrollments, total } = await EnrollmentService.list(status, page, limit);
    return res.json(ApiResponse.paginated(enrollments, { page, limit, total }, 'Pedidos de matrícula obtidos'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    return res.json(ApiResponse.success(await EnrollmentService.findById(req.params.id), 'Pedido de matrícula obtido'));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const enrollment = await EnrollmentService.update(req.params.id, req.body, req.user!.userId);
    return res.json(ApiResponse.success(enrollment, 'Pedido de matrícula actualizado'));
  });

  static approve = catchAsync(async (req: Request, res: Response) => {
    const result = await EnrollmentService.approve(req.params.id, req.body, req.user!.userId);
    return res.json(ApiResponse.success(result, 'Matrícula aprovada'));
  });

  static reject = catchAsync(async (req: Request, res: Response) => {
    const enrollment = await EnrollmentService.reject(req.params.id, req.body.reason, req.user!.userId);
    return res.json(ApiResponse.success(enrollment, 'Pedido de matrícula recusado'));
  });
}
