import { Router } from 'express';
import { TestController } from '../controllers/testController';

const router = Router();
router.get('/db-test', TestController.testDatabase);
export default router;
