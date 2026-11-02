import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken, requireAdmin, authorizeRoles } from '../middleware/auth';
import { validateRequest, createPaymentSchema } from '../utils/validation';

// Finance is visible to admins and to parents (their own invoices only); not to staff
const financeReaders = authorizeRoles('administrador', 'responsavel');

const router = Router();
router.use(authenticateToken);

router.get('/', financeReaders, PaymentController.getAll);
router.get('/invoice/:invoiceId', financeReaders, PaymentController.getByInvoiceId);
router.get('/:id', financeReaders, PaymentController.getById);
router.post('/', requireAdmin, validateRequest(createPaymentSchema), PaymentController.create);
router.delete('/:id', requireAdmin, PaymentController.delete);

export default router;
