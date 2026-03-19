import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  _id?: string;
  sender_id: mongoose.Types.ObjectId;
  recipient_id?: mongoose.Types.ObjectId; // null for broadcast messages
  recipient_role?: string; // e.g., 'responsavel', 'staff' - for role-based messages
  subject: string;
  content: string;
  message_type: 'info' | 'reminder' | 'alert' | 'general';
  is_read: boolean;
  read_at?: Date;
  child_id?: mongoose.Types.ObjectId; // Optional: message related to a child
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMessageDocument extends Omit<IMessage, '_id'>, Document {}

const messageSchema = new Schema<IMessageDocument>(
  {
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required']
    },
    recipient_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    recipient_role: {
      type: String,
      default: ''
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    message_type: {
      type: String,
      enum: ['info', 'reminder', 'alert', 'general'],
      default: 'general'
    },
    is_read: {
      type: Boolean,
      default: false
    },
    read_at: {
      type: Date
    },
    child_id: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      default: null
    }
  },
  { timestamps: true }
);

messageSchema.index({ sender_id: 1 });
messageSchema.index({ recipient_id: 1 });
messageSchema.index({ recipient_role: 1 });
messageSchema.index({ is_read: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ child_id: 1 });

export default mongoose.model<IMessageDocument>('Message', messageSchema);
