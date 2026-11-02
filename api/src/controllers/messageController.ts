import { Request, Response } from 'express';
import { runInBackground } from '../utils/background';
import { MessageService } from '../services/messageService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import User from '../models/User';
import Child from '../models/Child';
import StaffAssignment from '../models/StaffAssignment';
import { AccessService } from '../services/accessService';
import { ApiError } from '../utils/ApiError';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class MessageController {
  /**
   * Who the user may write to, with context for the picker: a parent's children (those the
   * caller can see) and a staff member's classes.
   */
  static getRecipients = catchAsync(async (req: Request, res: Response) => {
    const scope = await AccessService.scopeFor(req);
    const filter: Record<string, unknown> = await AccessService.messageableFilter(scope);
    const search = (req.query.search as string | undefined)?.trim();
    if (search) {
      const pattern = new RegExp(escapeRegExp(search), 'i');
      filter.$and = [{ $or: [{ firstName: pattern }, { lastName: pattern }] }];
    }

    const users = await User.find(filter).select('firstName lastName role').sort({ firstName: 1, lastName: 1 }).limit(200);
    const parentIds = users.filter((u) => u.role === 'responsavel').map((u) => u._id);
    const staffIds = users.filter((u) => u.role === 'staff').map((u) => u._id);

    const [children, assignments] = await Promise.all([
      Child.find({ parent_id: { $in: parentIds }, ...(scope.all ? {} : { _id: { $in: scope.childIds } }) }).select('name parent_id').lean(),
      StaffAssignment.find({ staff_id: { $in: staffIds } }).populate('class_id', 'name').lean()
    ]);

    const recipients = users.map((u) => ({
      id: String(u._id),
      name: u.fullName,
      role: u.role,
      ...(u.role === 'responsavel' && {
        children: children.filter((c) => String(c.parent_id) === String(u._id)).map((c) => c.name)
      }),
      ...(u.role === 'staff' && {
        classes: assignments.filter((a) => String(a.staff_id) === String(u._id)).map((a) => (a.class_id as any)?.name).filter(Boolean)
      })
    }));

    return res.json(ApiResponse.success(recipients, 'Destinatários obtidos'));
  });

  static getInbox = catchAsync(async (req: Request, res: Response) => {
    const unreadOnly = req.query.unread_only === 'true';
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { page, limit } = getPaginationParams(req);

    const result = await MessageService.findInbox(userId, role, unreadOnly, page, limit);
    return res.json(ApiResponse.paginated(result.messages, { page, limit, total: result.total }, 'Mensagens recuperadas com sucesso'));
  });

  static getSent = catchAsync(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req);
    const { messages, total } = await MessageService.findBySender(req.user!.userId, page, limit);
    return res.json(ApiResponse.paginated(messages, { page, limit, total }, 'Mensagens enviadas recuperadas com sucesso'));
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const message = await MessageService.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Mensagem não encontrada' });
    }
    const { userId, role } = req.user!;
    const senderId = (message.sender_id as any)?._id?.toString() ?? message.sender_id?.toString();
    const recipientId = (message.recipient_id as any)?._id?.toString() ?? message.recipient_id?.toString();
    const isOwner =
      senderId === userId ||
      recipientId === userId ||
      message.recipient_role === role;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    if (!message.is_read && recipientId === userId) {
      await MessageService.markAsRead(req.params.id);
    }
    return res.json(ApiResponse.success(message, 'Mensagem recuperada com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const scope = await AccessService.scopeFor(req);
    // Messages to a whole role (e.g. all parents) are for the administration only
    if (req.body.recipient_role && !scope.all) {
      throw new ApiError(403, 'Só a administração pode enviar mensagens para um grupo');
    }
    if (req.body.recipient_id) {
      // $and: the filter has its own _id condition (not yourself), which must not replace the recipient's
      const allowed = await User.exists({ $and: [{ _id: req.body.recipient_id }, await AccessService.messageableFilter(scope)] });
      if (!allowed) throw new ApiError(404, 'Destinatário não disponível');
    }
    if (req.body.child_id) AccessService.assertChild(scope, req.body.child_id);

    const message = await MessageService.create({
      ...req.body,
      sender_id: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(message, 'Mensagem enviada com sucesso', 201));

    // Fire-and-forget: notify individual recipient; skip role-broadcast (too many recipients)
    if (message.recipient_id) {
      runInBackground('MessageController notification', async () => {
        try {
          const [sender, recipient] = await Promise.all([
            User.findById(message.sender_id),
            User.findById(message.recipient_id)
          ]);
          if (sender && recipient) {
            await NotificationService.newMessage({
              recipientEmail: recipient.email,
              recipientPhone: NotificationService.whatsAppNumberFor(recipient),
              recipientName: recipient.fullName,
              senderName: sender.fullName,
              subject: message.subject,
              preview: message.content,
              role: recipient.role
            });
          }
        } catch (err) {
          console.error('[MessageController] Notification error:', err);
        }
      });
    }
  });

  static markAsRead = catchAsync(async (req: Request, res: Response) => {
    const existing = await MessageService.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Mensagem não encontrada' });
    }
    const { userId, role } = req.user!;
    const recipientId = (existing.recipient_id as any)?._id?.toString() ?? existing.recipient_id?.toString();
    const isRecipient = recipientId === userId || existing.recipient_role === role;
    if (!isRecipient) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    const message = await MessageService.markAsRead(req.params.id);
    return res.json(ApiResponse.success(message, 'Mensagem marcada como lida'));
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const existing = await MessageService.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Mensagem não encontrada' });
    }
    const senderId = (existing.sender_id as any)?._id?.toString() ?? existing.sender_id?.toString();
    const recipientId = (existing.recipient_id as any)?._id?.toString() ?? existing.recipient_id?.toString();
    const { userId, role } = req.user!;
    const isOwner = senderId === userId || recipientId === userId || existing.recipient_role === role;
    if (!isOwner && role !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    await MessageService.delete(req.params.id);
    return res.json(ApiResponse.success(null, 'Mensagem excluída com sucesso'));
  });
}
