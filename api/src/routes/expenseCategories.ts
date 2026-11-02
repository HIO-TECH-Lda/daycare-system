import { Router } from 'express';
import { ExpenseCategoryController } from '../controllers/expenseCategoryController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, createExpenseCategorySchema, updateExpenseCategorySchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/', requireAdmin, ExpenseCategoryController.getAll);
router.get('/:id', requireAdmin, ExpenseCategoryController.getById);
router.post('/', requireAdmin, validateRequest(createExpenseCategorySchema), ExpenseCategoryController.create);
router.put('/:id', requireAdmin, validateRequest(updateExpenseCategorySchema), ExpenseCategoryController.update);
router.delete('/:id', requireAdmin, ExpenseCategoryController.delete);

export default router;
