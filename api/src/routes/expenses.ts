import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { uploadReceipt } from '../middleware/upload';
import { validateRequest, createExpenseSchema, updateExpenseSchema } from '../utils/validation';

const router = Router();

router.use(authenticateToken);

router.get('/', ExpenseController.getAll);
router.get('/:id', ExpenseController.getById);
router.post('/', requireAdmin, uploadReceipt, validateRequest(createExpenseSchema), ExpenseController.create);
router.put('/:id', requireAdmin, uploadReceipt, validateRequest(updateExpenseSchema), ExpenseController.update);
router.delete('/:id', requireAdmin, ExpenseController.delete);

export default router;
