import { Request, Response } from 'express';
import PaymentClaim from '../models/PaymentClaim';
import Invoice from '../models/Invoice';
import { PaymentService } from '../services/paymentService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { getPaginationParams } from '../utils/pagination';

const METHOD_FOR_PAYMENT = {
  mpesa: { payment_method: 'mobile_money', payment_method_details: 'M-Pesa' },
  emola: { payment_method: 'mobile_money', payment_method_details: 'e-Mola' },
  bank_transfer: { payment_method: 'bank_transfer', payment_method_details: '' },
  cash: { payment_method: 'cash', payment_method_details: '' }
} as const;

const POPULATE = [
  { path: 'invoice_id', select: 'invoice_number amount status due_date' },
  { path: 'child_id', select: 'name' },
  { path: 'parent_id', select: 'firstName lastName phone' }
];

export class PaymentClaimController {
  /** Parents see their own claims; the administration sees all (optionally by status). */
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req);
    const { role, userId } = req.user!;
    const query: Record<string, unknown> = role === 'administrador' ? {} : { parent_id: userId };
    if (typeof req.query.status === 'string') query.status = req.query.status;
    if (typeof req.query.invoice_id === 'string') query.invoice_id = req.query.invoice_id;
    const [claims, total] = await Promise.all([
      PaymentClaim.find(query).populate(POPULATE).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      PaymentClaim.countDocuments(query)
    ]);
    res.json(ApiResponse.paginated(claims, { page, limit, total }, 'Pagamentos avisados'));
  });

  /** A parent: "I paid this invoice", with the transaction reference. */
  static create = catchAsync(async (req: Request, res: Response) => {
    const { invoice_id, amount, method, reference, paid_on, notes } = req.body;
    const invoice = await Invoice.findById(invoice_id);
    if (!invoice || String(invoice.parent_id) !== req.user!.userId) throw new ApiError(404, 'Factura não encontrada');
    if (invoice.status === 'paid' || invoice.status === 'cancelled') throw new ApiError(409, 'Esta factura já não tem valor em dívida');
    if (await PaymentClaim.exists({ invoice_id, status: 'pending' })) {
      throw new ApiError(409, 'Já avisou um pagamento desta factura. Aguarde a confirmação da administração.');
    }
    const claim = await PaymentClaim.create({
      invoice_id,
      parent_id: req.user!.userId,
      child_id: invoice.child_id,
      amount,
      method,
      reference: reference ?? '',
      paid_on: paid_on ?? new Date(),
      notes: notes ?? ''
    });
    await claim.populate(POPULATE);
    res.status(201).json(ApiResponse.success(claim, 'Pagamento avisado. A administração vai confirmar.', 201));
  });

  /** The administration found the money: record the payment (the invoice is marked paid when covered). */
  static confirm = catchAsync(async (req: Request, res: Response) => {
    const claim = await PaymentClaim.findById(req.params.id);
    if (!claim) throw new ApiError(404, 'Aviso de pagamento não encontrado');
    if (claim.status !== 'pending') throw new ApiError(409, 'Este aviso já foi tratado');
    const payment = await PaymentService.create({
      invoice_id: String(claim.invoice_id),
      parent_id: String(claim.parent_id),
      child_id: String(claim.child_id),
      amount: req.body.amount ?? claim.amount,
      payment_date: claim.paid_on,
      ...METHOD_FOR_PAYMENT[claim.method],
      reference_number: claim.reference,
      notes: 'Confirmado a partir do aviso do encarregado',
      recorded_by: req.user!.userId
    });
    claim.set({ status: 'confirmed', reviewed_by: req.user!.userId, reviewed_at: new Date(), payment_id: payment._id });
    await claim.save();
    await claim.populate(POPULATE);
    res.json(ApiResponse.success(claim, 'Pagamento confirmado'));
  });

  /** Not found on the account (wrong reference, amount…): the parent sees the reason. */
  static reject = catchAsync(async (req: Request, res: Response) => {
    const claim = await PaymentClaim.findById(req.params.id);
    if (!claim) throw new ApiError(404, 'Aviso de pagamento não encontrado');
    if (claim.status !== 'pending') throw new ApiError(409, 'Este aviso já foi tratado');
    claim.set({ status: 'rejected', reviewed_by: req.user!.userId, reviewed_at: new Date(), rejection_reason: req.body.reason });
    await claim.save();
    await claim.populate(POPULATE);
    res.json(ApiResponse.success(claim, 'Aviso de pagamento recusado'));
  });
}
