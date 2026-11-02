import { Request, Response } from 'express';
import { runInBackground } from '../utils/background';
import { changedSince } from '../utils/syncWrite';
import Attendance from '../models/Attendance';
import { AttendanceService } from '../services/attendanceService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import Child from '../models/Child';
import User from '../models/User';
import { AccessService } from '../services/accessService';

/** WhatsApp check-in/check-out message to the family (with consent), after the response. */
function notifyAttendance(attendance: any, what: { checkIn: boolean; checkOut: boolean }): void {
  if (!what.checkIn && !what.checkOut) return;
  if (attendance.status !== 'present' && attendance.status !== 'late') return;
  runInBackground('AttendanceController notification', async () => {
    const child = await Child.findById(attendance.child_id?._id ?? attendance.child_id);
    if (!child) return;
    const parent = await User.findById(child.parent_id);
    if (!parent || !NotificationService.whatsAppNumberFor(parent)) return;
    const dateStr = new Date(attendance.date).toLocaleDateString('pt-PT');
    const time = (value: Date) => new Date(value).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' });
    const common = {
      parentEmail: parent.email,
      parentPhone: NotificationService.whatsAppNumberFor(parent),
      parentName: parent.fullName,
      childName: child.name,
      date: dateStr
    };
    if (what.checkIn) await NotificationService.attendanceCheckIn({ ...common, checkInTime: time(attendance.check_in) });
    if (what.checkOut) await NotificationService.attendanceCheckOut({ ...common, checkOutTime: time(attendance.check_out) });
  });
}

export class AttendanceController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const childId = req.query.child_id as string | undefined;
    const date = req.query.date ? new Date(req.query.date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const scope = await AccessService.scopeFor(req);
    if (childId) AccessService.assertChild(scope, childId);
    let attendances: any[], total: number;
    if (date) {
      const result = await AttendanceService.findByDate(date, page, limit, AccessService.childFilter(scope));
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
        const result = await AttendanceService.findAll(page, limit, AccessService.childFilter(scope));
        attendances = result.attendances;
        total = result.total;
      }
    }
    return res.json(ApiResponse.paginated(attendances, { page, limit, total }, 'Registros de presença recuperados com sucesso'));
  });

  static getByChildId = catchAsync(async (req: Request, res: Response) => {
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    const { attendances, total } = await AttendanceService.findByChildId(req.params.childId, startDate, endDate, page, limit);
    return res.json(ApiResponse.paginated(attendances, { page, limit, total }, 'Registros de presença recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const attendance = await AttendanceService.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Registro de presença não encontrado' });
    }
    return res.json(ApiResponse.success(attendance, 'Registro de presença recuperado com sucesso'));
  });

  // Offline-safe: a replayed client_id returns the saved record; an existing record for the
  // child and day is updated (newest write wins). It's a conflict only when someone else wrote
  // it last (an educator's own check-out after their check-in is the normal sequence).
  static create = catchAsync(async (req: Request, res: Response) => {
    const { child_id, date, client_id, ...fields } = req.body;
    const { doc: attendance, outcome, previous } = await AttendanceService.record(
      child_id, date, { ...fields, recorded_by: req.user!.userId }, client_id
    );
    const conflict = outcome === 'merged' && String(previous?.recorded_by) !== req.user!.userId;
    res.status(outcome === 'created' ? 201 : 200).json({
      ...ApiResponse.success(attendance, 'Registro de presença guardado'),
      sync: outcome,
      ...(conflict && { conflict: true, previous })
    });

    // Tell the family about a check-in/check-out only the first time it's recorded
    if (outcome !== 'replayed') {
      notifyAttendance(attendance, {
        checkIn: !!attendance.check_in && !previous?.check_in,
        checkOut: !!attendance.check_out && !previous?.check_out
      });
    }
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const { base_updated_at, ...changes } = req.body;
    const before = await Attendance.findById(req.params.id).lean();
    const attendance = await AttendanceService.update(req.params.id, changes);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Registro de presença não encontrado' });
    }
    const conflict = changedSince(before, base_updated_at);
    res.json({
      ...ApiResponse.success(attendance, 'Registro de presença atualizado com sucesso'),
      ...(conflict && { conflict: true, previous: before })
    });

    notifyAttendance(attendance, { checkIn: false, checkOut: !!changes.check_out && !before?.check_out });
    return;
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const attendance = await AttendanceService.delete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Registro de presença não encontrado' });
    }
    return res.json(ApiResponse.success(null, 'Registro de presença excluído com sucesso'));
  });
}
