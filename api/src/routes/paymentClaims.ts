import { Router } from 'express';
import { PaymentClaimController } from '../controllers/paymentClaimController';
import { authenticateToken, authorizeRoles, requireAdmin, requireRole } from '../middleware/auth';
import { validateRequest, confirmPaymentClaimSchema, createPaymentClaimSchema, rejectPaymentClaimSchema } from '../utils/validation';

// "Já paguei": parents tell the centre they paid; the administration confirms or rejects
const router = Router();
router.use(authenticateToken);

router.get('/', authorizeRoles('administrador', 'responsavel'), PaymentClaimController.getAll);
router.post('/', requireRole('responsavel'), validateRequest(createPaymentClaimSchema), PaymentClaimController.create);
router.patch('/:id/confirm', requireAdmin, validateRequest(confirmPaymentClaimSchema), PaymentClaimController.confirm);
router.patch('/:id/reject', requireAdmin, validateRequest(rejectPaymentClaimSchema), PaymentClaimController.reject);

export default router;
