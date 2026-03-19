import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendanceService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import Child from '../models/Child';
import User from '../models/User';

export class AttendanceController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const childId = req.query.child_id as string | undefined;
    const date = req.query.date ? new Date(req.query.date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    let attendances: any[], total: number;
    if (date) {
      const result = await AttendanceService.findByDate(date, page, limit);
      attendances = result.attendances;
      total = result.total;
    } else {
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
      if (childId) {
        const result = await AttendanceService.findByChildId(childId, startDate, endDate, page, limit);
        attendances = result.attendances;
        total = result.total;
      } else {
        const result = await AttendanceService.findAll(page, limit);
        attendances = result.attendances;
        total = result.total;
      }
    }
    res.json(ApiResponse.paginated(attendances, { page, limit, total }, 'Registros de presença recuperados com sucesso'));
  });

  static getByChildId = catchAsync(async (req: Request, res: Response) => {
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const { attendances, total } = await AttendanceService.findByChildId(req.params.childId, startDate, endDate, page, limit);
    res.json(ApiResponse.paginated(attendances, { page, limit, total }, 'Registros de presença recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const attendance = await AttendanceService.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Registro de presença não encontrado' });
    }
    res.json(ApiResponse.success(attendance, 'Registro de presença recuperado com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const attendance = await AttendanceService.create({
      ...req.body,
      recorded_by: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(attendance, 'Registro de presença criado com sucesso', 201));

    // Fire-and-forget check-in/check-out WhatsApp notification to parent
    if (attendance.status === 'present' || attendance.status === 'late') {
      (async () => {
        try {
          const child = await Child.findById(attendance.child_id);
          if (!child) return;
          const parent = await User.findById(child.parent_id);
          if (!parent?.phone) return;
          const dateStr = new Date(attendance.date).toLocaleDateString('pt-BR');
          if (attendance.check_in) {
            const timeStr = new Date(attendance.check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            await NotificationService.attendanceCheckIn({
              parentEmail: parent.email,
              parentPhone: parent.phone,
              parentName: parent.fullName,
              childName: child.name,
              checkInTime: timeStr,
              date: dateStr
            });
          } else if (attendance.check_out) {
            const timeStr = new Date(attendance.check_out).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            await NotificationService.attendanceCheckOut({
              parentEmail: parent.email,
              parentPhone: parent.phone,
              parentName: parent.fullName,
              childName: child.name,
              checkOutTime: timeStr,
              date: dateStr
            });
          }
        } catch (err) {
          console.error('[AttendanceController] Notification error:', err);
        }
      })();
    }
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const attendance = await AttendanceService.update(req.params.id, req.body);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Registro de presença não encontrado' });
    }
    res.json(ApiResponse.success(attendance, 'Registro de presença atualizado com sucesso'));

    // Fire-and-forget check-out notification when check_out is recorded
    if (req.body.check_out) {
      (async () => {
        try {
          const child = await Child.findById(attendance.child_id);
          if (!child) return;
          const parent = await User.findById(child.parent_id);
          if (!parent?.phone) return;
          const timeStr = new Date(req.body.check_out).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dateStr = new Date(attendance.date).toLocaleDateString('pt-BR');
          await NotificationService.attendanceCheckOut({
            parentEmail: parent.email,
            parentPhone: parent.phone,
            parentName: parent.fullName,
            childName: child.name,
            checkOutTime: timeStr,
            date: dateStr
          });
        } catch (err) {
          console.error('[AttendanceController] Notification error:', err);
        }
      })();
    }
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const attendance = await AttendanceService.delete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Registro de presença não encontrado' });
    }
    res.json(ApiResponse.success(null, 'Registro de presença excluído com sucesso'));
  });
}
