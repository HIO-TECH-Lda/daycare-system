import { Request, Response } from 'express';
import { PickupPersonService } from '../services/pickupPersonService';
import { ChildService } from '../services/childService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class PickupPersonController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const childId = req.query.child_id as string | undefined;
    const { page, limit } = getPaginationParams(req);
    const { pickupPersons, total } = await PickupPersonService.findAll(childId, page, limit);
    res.json(ApiResponse.paginated(pickupPersons, { page, limit, total }, 'Pessoas autorizadas recuperadas com sucesso'));
  });

  static getByChildId = catchAsync(async (req: Request, res: Response) => {
    const pickupPersons = await PickupPersonService.findByChildId(req.params.childId);
    res.json(ApiResponse.success(pickupPersons, 'Pessoas autorizadas recuperadas com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const pickupPerson = await PickupPersonService.findById(req.params.id);
    if (!pickupPerson) {
      return res.status(404).json({ success: false, message: 'Pessoa autorizada não encontrada' });
    }
    return res.json(ApiResponse.success(pickupPerson, 'Pessoa autorizada recuperada com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const pickupPerson = await PickupPersonService.create(req.body);
    res.status(201).json(ApiResponse.success(pickupPerson, 'Pessoa autorizada criada com sucesso', 201));
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const pickupPerson = await PickupPersonService.update(req.params.id, req.body);
    if (!pickupPerson) {
      return res.status(404).json({ success: false, message: 'Pessoa autorizada não encontrada' });
    }
    return res.json(ApiResponse.success(pickupPerson, 'Pessoa autorizada atualizada com sucesso'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const pickupPerson = await PickupPersonService.delete(req.params.id);
    if (!pickupPerson) {
      return res.status(404).json({ success: false, message: 'Pessoa autorizada não encontrada' });
    }
    return res.json(ApiResponse.success(null, 'Pessoa autorizada excluída com sucesso'));
  });
}
