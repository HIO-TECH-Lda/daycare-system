import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import mongoose from 'mongoose';
import { AccessService } from '../services/accessService';
import { ApiError } from '../utils/ApiError';

/** Parents may only see payments of their own invoices (404 otherwise). */
function assertInvoice(allowed: Awaited<ReturnType<typeof AccessService.invoiceIds>>, invoiceId: unknown): void {
  const id = ((invoiceId as { _id?: unknown })?._id ?? invoiceId)?.toString();
  if (allowed !== 'all' && !allowed.some((a) => a.toString() === id)) {
    throw new ApiError(404, 'Pagamento não encontrado');
  }
}

export class PaymentController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const invoiceId = req.query.invoice_id as string | undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const { page, limit } = getPaginationParams(req);
    let payments, total;
    if (invoiceId) {
      assertInvoice(await AccessService.invoiceIds(await AccessService.scopeFor(req)), invoiceId);
      payments = await PaymentService.findByInvoiceId(invoiceId);
      total = payments.length;
    } else {
      // Parents: their own payments (with or without an invoice)
      const scope = req.user!.role === 'responsavel' ? { parent_id: new mongoose.Types.ObjectId(req.user!.userId) } : {};
      const result = await PaymentService.findAll(startDate, endDate, page, limit, scope);
      payments = result.payments;
      total = result.total;
    }
    res.json(ApiResponse.paginated(payments, { page, limit, total }, 'Pagamentos recuperados com sucesso'));
  });

  static getByInvoiceId = catchAsync(async (req: Request, res: Response) => {
    assertInvoice(await AccessService.invoiceIds(await AccessService.scopeFor(req)), req.params.invoiceId);
    const payments = await PaymentService.findByInvoiceId(req.params.invoiceId);
    res.json(ApiResponse.success(payments, 'Pagamentos recuperados com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const payment = await PaymentService.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Pagamento não encontrado' });
    }
    const owner = ((payment.parent_id as any)?._id ?? payment.parent_id)?.toString();
    if (req.user!.role === 'responsavel' && owner !== req.user!.userId) {
      throw new ApiError(404, 'Pagamento não encontrado');
    }
    return res.json(ApiResponse.success(payment, 'Pagamento recuperado com sucesso'));
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
    return res.json(ApiResponse.success(null, 'Pagamento excluído com sucesso'));
  });
}
