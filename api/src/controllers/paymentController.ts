import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';

export class PaymentController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const invoiceId = req.query.invoice_id as string | undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    let payments, total;
    if (invoiceId) {
      payments = await PaymentService.findByInvoiceId(invoiceId);
      total = payments.length;
    } else {
      const result = await PaymentService.findAll(startDate, endDate, page, limit);
      payments = result.payments;
      total = result.total;
    }
    res.json(ApiResponse.paginated(payments, { page, limit, total }, 'Pagamentos recuperados com sucesso'));
  });

  static getByInvoiceId = catchAsync(async (req: Request, res: Response) => {
    const payments = await PaymentService.findByInvoiceId(req.params.invoiceId);
    res.json(ApiResponse.success(payments, 'Pagamentos recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const payment = await PaymentService.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Pagamento não encontrado' });
    }
    res.json(ApiResponse.success(payment, 'Pagamento recuperado com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const payment = await PaymentService.create({
      ...req.body,
      recorded_by: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(payment, 'Pagamento registrado com sucesso', 201));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const payment = await PaymentService.delete(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Pagamento não encontrado' });
    }
    res.json(ApiResponse.success(null, 'Pagamento excluído com sucesso'));
  });
}
