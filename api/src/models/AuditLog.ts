import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog {
  _id?: string;
  userId?: Types.ObjectId;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: 'create' | 'read' | 'update' | 'delete';
  entityType: string; // e.g., 'user', 'order', 'product', 'category', 'blog', etc.
  entityId: string;
  entityName?: string; // For better readability
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    method?: string;
    url?: string;
    statusCode?: number;
  };
  description?: string;
  createdAt?: Date;
}

export interface IAuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const auditLogSchema = new Schema<IAuditLogDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: {
    type: String
  },
  userEmail: {
    type: String
  },
  userRole: {
    type: String
  },
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete'],
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: String,
    required: true,
    index: true
  },
  entityName: {
    type: String
  },
  changes: [{
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed }
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    method: String,
    url: String,
    statusCode: Number
  },
  description: {
    type: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
export default AuditLog;

