import Message, { IMessageDocument } from '../models/Message';
import mongoose, { FilterQuery } from 'mongoose';

export class MessageService {
  static async create(data: {
    sender_id: string;
    recipient_id?: string;
    recipient_role?: string;
    subject: string;
    content: string;
    message_type?: 'info' | 'reminder' | 'alert' | 'general';
    child_id?: string;
  }): Promise<IMessageDocument> {
    const messageData: any = {
      ...data,
      sender_id: new mongoose.Types.ObjectId(data.sender_id)
    };
    if (data.recipient_id) {
      messageData.recipient_id = new mongoose.Types.ObjectId(data.recipient_id);
    }
    if (data.child_id) {
      messageData.child_id = new mongoose.Types.ObjectId(data.child_id);
    }
    const message = await Message.create(messageData);
    return await message.populate('sender_id', 'firstName lastName email')
      .populate('recipient_id', 'firstName lastName email')
      .populate('child_id', 'name');
  }

  static async findInbox(userId: string, role: string, unreadOnly?: boolean, page = 1, limit = 20): Promise<{ messages: IMessageDocument[]; total: number }> {
    const query: FilterQuery<IMessageDocument> = {
      $or: [
        { recipient_id: new mongoose.Types.ObjectId(userId) },
        { recipient_role: role }
      ]
    };
    if (unreadOnly) query.is_read = false;
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('sender_id', 'firstName lastName email')
        .populate('child_id', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(query)
    ]);
    return { messages, total };
  }

  static async findByRecipient(recipientId: string, unreadOnly?: boolean, page = 1, limit = 20): Promise<{ messages: IMessageDocument[]; total: number }> {
    const query: any = { recipient_id: new mongoose.Types.ObjectId(recipientId) };
    if (unreadOnly) query.is_read = false;
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('sender_id', 'firstName lastName email')
        .populate('child_id', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(query)
    ]);
    return { messages, total };
  }

  static async findByRole(role: string, unreadOnly?: boolean, page = 1, limit = 20): Promise<{ messages: IMessageDocument[]; total: number }> {
    const query: any = { recipient_role: role };
    if (unreadOnly) query.is_read = false;
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('sender_id', 'firstName lastName email')
        .populate('child_id', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(query)
    ]);
    return { messages, total };
  }

  static async findBySender(senderId: string, page = 1, limit = 20): Promise<{ messages: IMessageDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      Message.find({ sender_id: new mongoose.Types.ObjectId(senderId) })
        .populate('recipient_id', 'firstName lastName email')
        .populate('child_id', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ sender_id: new mongoose.Types.ObjectId(senderId) })
    ]);
    return { messages, total };
  }

  static async findById(id: string): Promise<IMessageDocument | null> {
    return await Message.findById(id)
      .populate('sender_id', 'firstName lastName email')
      .populate('recipient_id', 'firstName lastName email')
      .populate('child_id', 'name');
  }

  static async markAsRead(id: string): Promise<IMessageDocument | null> {
    return await Message.findByIdAndUpdate(id, {
      is_read: true,
      read_at: new Date()
    }, { new: true });
  }

  static async update(id: string, data: Partial<any>): Promise<IMessageDocument | null> {
    return await Message.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    })
      .populate('sender_id', 'firstName lastName email')
      .populate('recipient_id', 'firstName lastName email');
  }

  static async delete(id: string): Promise<IMessageDocument | null> {
    return await Message.findByIdAndDelete(id);
  }
}
