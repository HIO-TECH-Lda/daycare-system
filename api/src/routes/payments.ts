import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, createPaymentSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', PaymentController.getAll);
router.get('/invoice/:invoiceId', PaymentController.getByInvoiceId);
router.get('/:id', PaymentController.getById);
router.post('/', requireAdmin, validateRequest(createPaymentSchema), PaymentController.create);
router.delete('/:id', requireAdmin, PaymentController.delete);

export default router;
