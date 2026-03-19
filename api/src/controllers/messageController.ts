import { Request, Response } from 'express';
import { MessageService } from '../services/messageService';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import { getPaginationParams } from '../utils/pagination';
import User from '../models/User';

export class MessageController {
  static getInbox = catchAsync(async (req: Request, res: Response) => {
    const unreadOnly = req.query.unread_only === 'true';
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { page, limit } = getPaginationParams(req);

    // All roles: inbox = messages sent directly to the user OR broadcast to their role
    const result = await MessageService.findInbox(userId, role, unreadOnly, page, limit);
    res.json(ApiResponse.paginated(result.messages, { page, limit, total: result.total }, 'Mensagens recuperadas com sucesso'));
  });

  static getSent = catchAsync(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req);
    const { messages, total } = await MessageService.findBySender(req.user!.userId, page, limit);
    res.json(ApiResponse.paginated(messages, { page, limit, total }, 'Mensagens enviadas recuperadas com sucesso'));
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
    res.json(ApiResponse.success(message, 'Mensagem recuperada com sucesso'));
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const message = await MessageService.create({
      ...req.body,
      sender_id: req.user!.userId
    });
    res.status(201).json(ApiResponse.success(message, 'Mensagem enviada com sucesso', 201));

    // Fire-and-forget: notify individual recipient; skip role-broadcast (too many recipients)
    if (message.recipient_id) {
      (async () => {
        try {
          const [sender, recipient] = await Promise.all([
            User.findById(message.sender_id),
            User.findById(message.recipient_id)
          ]);
          if (sender && recipient) {
            await NotificationService.newMessage({
              recipientEmail: recipient.email,
              recipientPhone: recipient.phone,
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
      })();
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
    res.json(ApiResponse.success(message, 'Mensagem marcada como lida'));
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
    res.json(ApiResponse.success(null, 'Mensagem excluída com sucesso'));
  });
}
