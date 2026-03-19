import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
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
import expenseCategoryRoutes from './routes/expenseCategories';
import expenseRoutes from './routes/expenses';
import messageRoutes from './routes/messages';
import monthlyReportRoutes from './routes/monthlyReports';
import userRoutes from './routes/users';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
      test: '/api/v1/test',
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
      expenseCategories: '/api/v1/expense-categories',
      expenses: '/api/v1/expenses',
      messages: '/api/v1/messages',
      monthlyReports: '/api/v1/monthly-reports',
      users: '/api/v1/users'
    },
    authEndpoints: {
      register: 'POST /api/v1/auth/register',
      login: 'POST /api/v1/auth/login',
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

app.use('/api/v1/test', testRoutes);
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
app.use('/api/v1/expense-categories', expenseCategoryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/monthly-reports', monthlyReportRoutes);
app.use('/api/v1/users', userRoutes);

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: Messages.ERROR.ROUTE_NOT_FOUND
  });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
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
