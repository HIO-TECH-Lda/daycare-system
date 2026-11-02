import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import Invoice from '../models/Invoice';
import User from '../models/User';
import Child from '../models/Child';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import { runInBackground } from '../utils/background';
import { startOfCentreDay } from '../utils/dates';
import ApiResponse from '../utils/ApiResponse';

/**
 * Scheduled jobs, called by Vercel Cron with `Authorization: Bearer <CRON_SECRET>`.
 * Without CRON_SECRET the jobs are disabled (503).
 */
const router = Router();

function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'Tarefas agendadas desactivadas (CRON_SECRET não definido)' });
  const given = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(401).json({ success: false, message: 'Não autorizado' });
  }
  return next();
}

/**
 * Invoices still pending after their due date become overdue, and the family is told.
 * Idempotent: running it twice the same day changes nothing the second time.
 */
const markOverdue = catchAsync(async (_req: Request, res: Response) => {
  const today = startOfCentreDay(new Date());
  const due = await Invoice.find({ status: 'pending', due_date: { $lt: today } }).select('_id');
  const ids = due.map((i) => i._id);
  // Only invoices still pending at update time (a payment may have arrived meanwhile)
  const { modifiedCount } = await Invoice.updateMany({ _id: { $in: ids }, status: 'pending' }, { status: 'overdue' });

  const updated = await Invoice.find({ _id: { $in: ids }, status: 'overdue' });
  for (const invoice of updated) {
    runInBackground('overdue invoice notification', async () => {
      const [parent, child] = await Promise.all([User.findById(invoice.parent_id), Child.findById(invoice.child_id)]);
      if (!parent || !child) return;
      await NotificationService.invoiceOverdue({
        parentEmail: parent.email,
        parentPhone: NotificationService.whatsAppNumberFor(parent),
        parentName: parent.fullName,
        childName: child.name,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        dueDate: new Date(invoice.due_date).toLocaleDateString('pt-PT')
      });
    });
  }

  return res.json(ApiResponse.success({ marked_overdue: modifiedCount }, 'Facturas em atraso actualizadas'));
});

router.get('/mark-overdue', requireCronSecret, markOverdue);
router.post('/mark-overdue', requireCronSecret, markOverdue);

export default router;
