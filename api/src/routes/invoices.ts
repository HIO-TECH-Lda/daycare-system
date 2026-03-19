import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, createInvoiceSchema, updateInvoiceSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', InvoiceController.getAll);
router.get('/:id', InvoiceController.getById);
router.post('/', requireAdmin, validateRequest(createInvoiceSchema), InvoiceController.create);
router.put('/:id', requireAdmin, validateRequest(updateInvoiceSchema), InvoiceController.update);
router.patch('/:id/status', requireAdmin, InvoiceController.updateStatus);
router.delete('/:id', requireAdmin, InvoiceController.delete);

export default router;
