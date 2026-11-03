import { Request, Response } from 'express';
import { runInBackground } from '../utils/background';
import { InvoiceService } from '../services/invoiceService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import User from '../models/User';
import Child from '../models/Child';
import Invoice, { IInvoiceDocument } from '../models/Invoice';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** "New invoice" to the family (WhatsApp with consent and email, as they prefer), after the response. */
function notifyNewInvoice(invoice: IInvoiceDocument): void {
  runInBackground('InvoiceController notification', async () => {
    const [parent, child] = await Promise.all([User.findById(invoice.parent_id), Child.findById(invoice.child_id)]);
    if (!parent || !child) return;
    await NotificationService.newInvoice({
      parent,
      childName: child.name,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      dueDate: new Date(invoice.due_date).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' })
    });
  });
}

export class InvoiceController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    let parentId = req.query.parent_id as string | undefined;
    const status = req.query.status as string | undefined;
    const { page, limit } = getPaginationParams(req);

    if (req.user!.role === 'responsavel') {
      parentId = req.user!.userId;
    }

    const { invoices, total } = await InvoiceService.findAll(parentId, status, page, limit);
    return res.json(ApiResponse.paginated(invoices, { page, limit, total }, 'Faturas recuperadas com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const invoice = await InvoiceService.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Fatura não encontrada' });
    }
    if (req.user!.role === 'responsavel') {
      const parentId = (invoice.parent_id as any)?._id?.toString() ?? invoice.parent_id?.toString();
      if (parentId !== req.user!.userId) {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      }
    }
    return res.json(ApiResponse.success(invoice, 'Fatura recuperada com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const invoice = await InvoiceService.create({
      ...req.body,
      created_by: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(invoice, 'Fatura criada com sucesso', 201));

    notifyNewInvoice(invoice);
  });

  /**
   * The month's propina for every child of the chosen classes, at each class's amount. Children
   * who already have an invoice for that month are skipped, so running it twice is harmless.
   */
  static generate = catchAsync(async (req: Request, res: Response) => {
    const { period, due_date, amounts, description } = req.body as {
      period: string;
      due_date: Date;
      amounts: { class_id: string; amount: number }[];
      description?: string;
    };
    const [year, month] = period.split('-').map(Number);
    const label = description || `Propina ${MONTHS[month - 1]} ${year}`;
    const amountFor = new Map(amounts.map((row) => [row.class_id, row.amount]));
    const children = await Child.find({ class_id: { $in: [...amountFor.keys()] } }).select('class_id parent_id').lean();
    const existing = new Set(
      (await Invoice.find({ period, child_id: { $in: children.map((c) => c._id) }, status: { $ne: 'cancelled' } }).select('child_id').lean()).map((i) => String(i.child_id))
    );

    const created: IInvoiceDocument[] = [];
    for (const child of children) {
      if (existing.has(String(child._id)) || !child.parent_id) continue;
      const amount = amountFor.get(String(child.class_id))!;
      created.push(
        await InvoiceService.create({
          child_id: String(child._id),
          parent_id: String(child.parent_id),
          due_date: due_date,
          amount,
          items: [{ description: label, quantity: 1, unit_price: amount, total: amount }],
          period,
          created_by: req.user!.userId
        })
      );
    }
    res.status(201).json(ApiResponse.success({ created: created.length, skipped: children.length - created.length, invoices: created }, `${created.length} facturas emitidas`, 201));
    created.forEach(notifyNewInvoice);
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const invoice = await InvoiceService.update(req.params.id, req.body);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Fatura não encontrada' });
    }
    return res.json(ApiResponse.success(invoice, 'Fatura atualizada com sucesso'));
  });

  static updateStatus = catchAsync(async (req: Request, res: Response) => {
    const { status } = req.body;
    const invoice = await InvoiceService.updateStatus(req.params.id, status);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Fatura não encontrada' });
    }
    res.json(ApiResponse.success(invoice, 'Status da fatura atualizado com sucesso'));

    // Fire-and-forget status change notifications
    if (status === 'overdue' || status === 'paid') {
      runInBackground('InvoiceController notification', async () => {
        try {
          const [parent, child] = await Promise.all([
            User.findById(invoice.parent_id),
            Child.findById(invoice.child_id)
          ]);
          if (parent && child) {
            if (status === 'overdue') {
              await NotificationService.invoiceOverdue({
                parent,
                childName: child.name,
                invoiceNumber: invoice.invoice_number,
                amount: invoice.amount,
                dueDate: new Date(invoice.due_date).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' })
              });
            } else {
              await NotificationService.invoicePaid({
                parent,
                childName: child.name,
                invoiceNumber: invoice.invoice_number,
                amount: invoice.amount
              });
            }
          }
        } catch (err) {
          console.error('[InvoiceController] Notification error:', err);
        }
      });
    }
    return;
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const invoice = await InvoiceService.delete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Fatura não encontrada' });
    }
    return res.json(ApiResponse.success(null, 'Fatura excluída com sucesso'));
  });
}
