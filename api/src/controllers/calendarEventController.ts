import { Request, Response } from 'express';
import { CalendarEventService } from '../services/calendarEventService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class CalendarEventController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const classId = req.query.class_id as string | undefined;
    const { page, limit } = getPaginationParams(req);
    const { events, total } = await CalendarEventService.findAll(startDate, endDate, classId, page, limit);
    res.json(ApiResponse.paginated(events, { page, limit, total }, 'Eventos do calendário recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const event = await CalendarEventService.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    }
    return res.json(ApiResponse.success(event, 'Evento recuperado com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const event = await CalendarEventService.create({
      ...req.body,
      created_by: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(event, 'Evento criado com sucesso', 201));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const event = await CalendarEventService.update(req.params.id, req.body);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    }
    return res.json(ApiResponse.success(event, 'Evento atualizado com sucesso'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const event = await CalendarEventService.delete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado' });
    }
    return res.json(ApiResponse.success(null, 'Evento excluído com sucesso'));
  });
}
