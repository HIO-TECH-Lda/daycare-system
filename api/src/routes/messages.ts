import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticateToken, requireStaff } from '../middleware/auth';
import { validateRequest, createMessageSchema } from '../utils/validation';

const router = Router();
router.use(authenticateToken);

router.get('/inbox', MessageController.getInbox);
router.get('/sent', MessageController.getSent);
router.get('/:id', MessageController.getById);
router.post('/', validateRequest(createMessageSchema), MessageController.create);
router.patch('/:id/read', MessageController.markAsRead);
router.delete('/:id', MessageController.delete);

export default router;
