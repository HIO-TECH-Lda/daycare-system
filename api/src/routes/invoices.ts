import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { authenticateToken, requireAdmin, authorizeRoles } from '../middleware/auth';
import { validateRequest, createInvoiceSchema, updateInvoiceSchema } from '../utils/validation';

// Finance is visible to admins and to parents (their own invoices only); not to staff
const financeReaders = authorizeRoles('administrador', 'responsavel');

const router = Router();
router.use(authenticateToken);

router.get('/', financeReaders, InvoiceController.getAll);
router.get('/:id', financeReaders, InvoiceController.getById);
router.post('/', requireAdmin, validateRequest(createInvoiceSchema), InvoiceController.create);
router.put('/:id', requireAdmin, validateRequest(updateInvoiceSchema), InvoiceController.update);
router.patch('/:id/status', requireAdmin, InvoiceController.updateStatus);
router.delete('/:id', requireAdmin, InvoiceController.delete);

export default router;
