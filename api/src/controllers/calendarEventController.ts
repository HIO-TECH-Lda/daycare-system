import { Request, Response } from 'express';
import { CalendarEventService } from '../services/calendarEventService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import { AccessService } from '../services/accessService';
import CalendarEvent from '../models/CalendarEvent';
import { ApiError } from '../utils/ApiError';

/** Educators manage their own classes' events; centre-wide events (no class) are the administration's. */
async function assertCanManage(req: Request, classId: unknown): Promise<void> {
  const scope = await AccessService.scopeFor(req);
  if (scope.all) return;
  if (!classId || !AccessService.canSeeClass(scope, classId)) {
    throw new ApiError(403, 'Só pode gerir eventos das suas turmas');
  }
}

export class CalendarEventController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const classId = req.query.class_id as string | undefined;
    const { page, limit } = getPaginationParams(req);
    const scope = await AccessService.scopeFor(req);
    if (classId && !AccessService.canSeeClass(scope, classId)) {
      return res.json(ApiResponse.paginated([], { page, limit, total: 0 }, 'Eventos do calendário recuperados com sucesso'));
    }
    // Everyone sees centre-wide events (no class); class events only for their own classes
    const visible = scope.all ? {} : { $or: [{ class_id: null }, { class_id: { $in: scope.classIds } }] };
    const { events, total } = await CalendarEventService.findAll(startDate, endDate, classId, page, limit, visible);
    return res.json(ApiResponse.paginated(events, { page, limit, total }, 'Eventos do calendário recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const event = await CalendarEventService.findById(req.params.id);
    if (!event || (event.class_id && !AccessService.canSeeClass(await AccessService.scopeFor(req), event.class_id))) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    }
    return res.json(ApiResponse.success(event, 'Evento recuperado com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    await assertCanManage(req, req.body.class_id);
    const event = await CalendarEventService.create({
      ...req.body,
      created_by: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(event, 'Evento criado com sucesso', 201));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const existing = await CalendarEvent.findById(req.params.id).select('class_id').lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    await assertCanManage(req, existing.class_id);
    if ('class_id' in req.body) await assertCanManage(req, req.body.class_id);
    const event = await CalendarEventService.update(req.params.id, req.body);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    }
    return res.json(ApiResponse.success(event, 'Evento atualizado com sucesso'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const existing = await CalendarEvent.findById(req.params.id).select('class_id').lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    await assertCanManage(req, existing.class_id);
    const event = await CalendarEventService.delete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    }
    return res.json(ApiResponse.success(null, 'Evento excluído com sucesso'));
  });
}
