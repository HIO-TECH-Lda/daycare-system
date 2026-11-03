import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import NotificationLog from '../models/NotificationLog';
import User from '../models/User';
import { NotificationService } from '../services/notificationService';
import { isWhatsAppConfigured } from '../services/whatsAppService';
import { isEmailConfigured } from '../services/emailService';
import { catchAsync } from '../utils/catchAsync';
import { getPaginationParams } from '../utils/pagination';
import ApiResponse from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

/** The notification log for the administration: what was sent, how it went, and resends. */
const router = Router();
router.use(authenticateToken, requireAdmin);

const CHANNELS = ['whatsapp', 'email'];
const CATEGORIES = ['account', 'enrollment', 'billing', 'reports', 'attendance', 'messages'];
const STATUSES = ['sent', 'delivered', 'read', 'failed', 'skipped'];

const pick = (value: unknown, allowed: string[]) => (typeof value === 'string' && allowed.includes(value) ? value : undefined);
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Query: status, channel, category, search (name, phone or email), page, limit
router.get('/', catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req, 30);
  const filter: Record<string, unknown> = {};
  const status = pick(req.query.status, STATUSES);
  const channel = pick(req.query.channel, CHANNELS);
  const category = pick(req.query.category, CATEGORIES);
  if (status) filter.status = status;
  if (channel) filter.channel = channel;
  if (category) filter.category = category;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : '';
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ $or: [{ firstName: pattern }, { lastName: pattern }, { email: pattern }, { phone: pattern }] }).select('_id').limit(50);
    filter.$or = [{ recipient: pattern }, { user_id: { $in: users.map((user) => user._id) } }];
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [rows, total, failedThisWeek] = await Promise.all([
    NotificationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user_id', 'firstName lastName role').lean(),
    NotificationLog.countDocuments(filter),
    NotificationLog.countDocuments({ status: 'failed', createdAt: { $gte: weekAgo } })
  ]);
  // Rows already resent, or covered by an email fallback: the screen shows that instead of "Reenviar"
  const ids = rows.map((row) => row._id);
  const followUps = await NotificationLog.find({ $or: [{ resend_of: { $in: ids } }, { fallback_of: { $in: ids } }] }).select('resend_of fallback_of').lean();
  const handled = new Set(followUps.flatMap((row) => [row.resend_of, row.fallback_of].filter(Boolean).map(String)));

  // The payload stays on the server (message text and email context)
  const data = rows.map(({ payload, ...row }) => ({ ...row, resendable: !!payload && !handled.has(String(row._id)), handled: handled.has(String(row._id)) }));
  return res.json({
    ...ApiResponse.paginated(data, { page, limit, total }, 'Notificações'),
    meta: { failed_this_week: failedThisWeek, whatsapp_configured: isWhatsAppConfigured(), email_configured: isEmailConfigured() }
  });
}));

router.post('/:id/resend', catchAsync(async (req: Request, res: Response) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new ApiError(400, 'Identificador inválido');
  const result = await NotificationService.resend(req.params.id);
  if (!result.ok) return res.status(result.reason === 'Notificação não encontrada' ? 404 : 422).json({ success: false, message: result.reason });
  return res.json(ApiResponse.success(null, 'Notificação reenviada'));
}));

export default router;
