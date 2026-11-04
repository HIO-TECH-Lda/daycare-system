import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import { MAX_UPLOAD_MB } from './middleware/upload';
import { connectDB } from './config/database';
import { corsOptions } from './config/cors';
import { ApiError } from './utils/ApiError';
import { validateEnvironmentVariables } from './utils/envValidation';
import Messages from './utils/messages';
import { auditLogMiddleware } from './middleware/auditLog';
import testRoutes from './routes/test';
import authRoutes from './routes/auth';
import classRoutes from './routes/classes';
import childRoutes from './routes/children';
import staffAssignmentRoutes from './routes/staffAssignments';
import guardianRoutes from './routes/guardians';
import pickupPersonRoutes from './routes/pickupPersons';
import dailyReportRoutes from './routes/dailyReports';
import activityRoutes from './routes/activities';
import reportPhotoRoutes from './routes/reportPhotos';
import attendanceRoutes from './routes/attendance';
import calendarEventRoutes from './routes/calendarEvents';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import paymentClaimRoutes from './routes/paymentClaims';
import expenseCategoryRoutes from './routes/expenseCategories';
import expenseRoutes from './routes/expenses';
import messageRoutes from './routes/messages';
import monthlyReportRoutes from './routes/monthlyReports';
import userRoutes from './routes/users';
import mediaRoutes from './routes/media';
import enrollmentRoutes from './routes/enrollments';
import reportRoutes from './routes/reports';
import jobRoutes from './routes/jobs';
import webhookRoutes from './routes/webhooks';
import notificationRoutes from './routes/notifications';
import { isMediaUrl } from './utils/media';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3002;

// Behind Vercel's proxy: use X-Forwarded-For for the client IP (rate limiting, audit log)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors(corsOptions));
// Keep the raw body: the WhatsApp webhook's signature is computed over the exact bytes Meta sent
app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { (req as Request & { rawBody?: Buffer }).rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Clients may send back the signed media links they received (e.g. when saving a whole record):
// drop them so the stored file URL is kept
app.use((req: Request, _res: Response, next: NextFunction) => {
  for (const field of ['photo_url', 'receipt_url']) {
    if (req.body && isMediaUrl(req.body[field])) delete req.body[field];
  }
  next();
});
app.use(auditLogMiddleware);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: Messages.API.TOO_MANY_REQUESTS
});
app.use(limiter);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: Messages.API.RUNNING,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    message: Messages.API.WELCOME,
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: '/api/v1/auth',
      classes: '/api/v1/classes',
      children: '/api/v1/children',
      staffAssignments: '/api/v1/staff-assignments',
      guardians: '/api/v1/guardians',
      pickupPersons: '/api/v1/pickup-persons',
      dailyReports: '/api/v1/daily-reports',
      activities: '/api/v1/activities',
      reportPhotos: '/api/v1/report-photos',
      attendance: '/api/v1/attendance',
      calendarEvents: '/api/v1/calendar-events',
      invoices: '/api/v1/invoices',
      payments: '/api/v1/payments',
      paymentClaims: '/api/v1/payment-claims',
      expenseCategories: '/api/v1/expense-categories',
      expenses: '/api/v1/expenses',
      messages: '/api/v1/messages',
      monthlyReports: '/api/v1/monthly-reports',
      users: '/api/v1/users',
      media: '/api/v1/media/:kind/:id (signed links only)',
      enrollments: '/api/v1/enrollments',
      reports: '/api/v1/reports',
      notifications: '/api/v1/notifications',
      whatsappWebhook: '/api/v1/webhooks/whatsapp'
    },
    authEndpoints: {
      login: 'POST /api/v1/auth/login',
      getInvite: 'GET /api/v1/auth/invite/:token',
      acceptInvite: 'POST /api/v1/auth/accept-invite',
      refresh: 'POST /api/v1/auth/refresh',
      profile: 'GET /api/v1/auth/me',
      updateProfile: 'PUT /api/v1/auth/me',
      changePassword: 'PUT /api/v1/auth/change-password',
      logout: 'POST /api/v1/auth/logout',
      forgotPassword: 'POST /api/v1/auth/forgot-password',
      resetPassword: 'POST /api/v1/auth/reset-password'
    }
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/v1/test', testRoutes);
}
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/children', childRoutes);
app.use('/api/v1/staff-assignments', staffAssignmentRoutes);
app.use('/api/v1/guardians', guardianRoutes);
app.use('/api/v1/pickup-persons', pickupPersonRoutes);
app.use('/api/v1/daily-reports', dailyReportRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/report-photos', reportPhotoRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/calendar-events', calendarEventRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payment-claims', paymentClaimRoutes);
app.use('/api/v1/expense-categories', expenseCategoryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/monthly-reports', monthlyReportRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: Messages.ERROR.ROUTE_NOT_FOUND
  });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  // Uploads: too large, or unexpected form fields
  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? res.status(413).json({ success: false, message: `Ficheiro demasiado grande (máximo ${MAX_UPLOAD_MB} MB)` })
      : res.status(400).json({ success: false, message: 'Pedido de envio de ficheiro inválido' });
  }
  // Malformed ObjectId in a URL, e.g. /users/not-an-id
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Identificador inválido' });
  }
  // Model validation (e.g. a user left with neither email nor phone)
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: Messages.ERROR.VALIDATION_FAILED,
      errors: Object.values(err.errors).map((e) => e.message)
    });
  }
  // Unique index race (two requests creating the same email/phone at once)
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0];
    const message = field === 'phone' ? Messages.AUTH.PHONE_ALREADY_EXISTS
      : field === 'email' ? Messages.AUTH.EMAIL_ALREADY_EXISTS
      : 'Registo duplicado';
    return res.status(409).json({ success: false, message });
  }
  console.error(err.stack);
  return res.status(500).json({
    success: false,
    message: Messages.ERROR.INTERNAL_SERVER_ERROR,
    error: process.env.NODE_ENV === 'development' ? err.message : Messages.ERROR.SOMETHING_WENT_WRONG
  });
});

const startServer = async () => {
  try {
    if (!validateEnvironmentVariables()) {
      console.error('❌ Environment validation failed. Please check your .env file.');
      process.exit(1);
    }
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api/v1`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { app };
