import { Router, Request, Response, NextFunction } from 'express';
import { EnrollmentController } from '../controllers/enrollmentController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { enrollmentLimiter } from '../middleware/rateLimits';
import {
  validateRequest,
  submitEnrollmentSchema,
  updateEnrollmentSchema,
  approveEnrollmentSchema,
  rejectEnrollmentSchema
} from '../utils/validation';

const router = Router();

// The form is public; when a logged-in admin submits it (on a family's behalf) the request is recorded as theirs
const identifyIfLoggedIn = (req: Request, res: Response, next: NextFunction) =>
  req.headers.authorization ? authenticateToken(req, res, next) : next();

router.post('/', identifyIfLoggedIn, enrollmentLimiter, validateRequest(submitEnrollmentSchema), EnrollmentController.submit);

// Everything else: admins only
router.use(authenticateToken, requireAdmin);
router.get('/', EnrollmentController.list);
router.get('/:id', EnrollmentController.getById);
router.put('/:id', validateRequest(updateEnrollmentSchema), EnrollmentController.update);
router.post('/:id/approve', validateRequest(approveEnrollmentSchema), EnrollmentController.approve);
router.post('/:id/reject', validateRequest(rejectEnrollmentSchema), EnrollmentController.reject);

export default router;
