import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requireStaff } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/', requireStaff, UserController.getAll);

export default router;
