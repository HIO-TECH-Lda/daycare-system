import { Request, Response } from 'express';
import { InvoiceService } from '../services/invoiceService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import User from '../models/User';
import Child from '../models/Child';

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

    // Fire-and-forget new invoice notification
    (async () => {
      try {
        const [parent, child] = await Promise.all([
          User.findById(invoice.parent_id),
          Child.findById(invoice.child_id)
        ]);
        if (parent && child) {
          await NotificationService.newInvoice({
            parentEmail: parent.email,
            parentPhone: parent.phone,
            parentName: parent.fullName,
            childName: child.name,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            dueDate: new Date(invoice.due_date).toLocaleDateString('pt-BR')
          });
        }
      } catch (err) {
        console.error('[InvoiceController] Notification error:', err);
      }
    })();
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
      (async () => {
        try {
          const [parent, child] = await Promise.all([
            User.findById(invoice.parent_id),
            Child.findById(invoice.child_id)
          ]);
          if (parent && child) {
            if (status === 'overdue') {
              await NotificationService.invoiceOverdue({
                parentEmail: parent.email,
                parentPhone: parent.phone,
                parentName: parent.fullName,
                childName: child.name,
                invoiceNumber: invoice.invoice_number,
                amount: invoice.amount,
                dueDate: new Date(invoice.due_date).toLocaleDateString('pt-BR')
              });
            } else {
              await NotificationService.invoicePaid({
                parentEmail: parent.email,
                parentPhone: parent.phone,
                parentName: parent.fullName,
                childName: child.name,
                invoiceNumber: invoice.invoice_number,
                amount: invoice.amount
              });
            }
          }
        } catch (err) {
          console.error('[InvoiceController] Notification error:', err);
        }
      })();
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
