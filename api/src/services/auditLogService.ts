import AuditLog from '../models/AuditLog';
import { Request } from 'express';

export class AuditLogService {
  // Create audit log entry
  static async log(data: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    action: 'create' | 'read' | 'update' | 'delete';
    entityType: string;
    entityId: string;
    entityName?: string;
    changes?: Array<{ field: string; oldValue: any; newValue: any }>;
    description?: string;
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
    };
  }): Promise<void> {
    try {
      await AuditLog.create(data);
    } catch (error) {
      // Log error but don't throw - audit logging should not break the main flow
      console.error('Failed to create audit log:', error);
    }
  }

  // Helper to log from Express request (DEPRECATED - Use global middleware instead)
  static async logFromRequest(
    req: Request,
    action: 'create' | 'read' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    entityName?: string,
    changes?: Array<{ field: string; oldValue: any; newValue: any }>,
    description?: string
  ): Promise<void> {
    const user = (req as any).user;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    await this.log({
      userId: user?.userId,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : undefined,
      userEmail: user?.email,
      userRole: user?.role,
      action,
      entityType,
      entityId,
      entityName,
      changes,
      description,
      metadata: {
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        userAgent: req.headers['user-agent'],
        method: req.method,
        url: req.originalUrl,
        statusCode: 200
      }
    });
  }

  // Compare objects to generate changes array
  static detectChanges(oldObj: any, newObj: any, fieldsToTrack?: string[]): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    
    if (!oldObj || !newObj) return changes;

    const fields = fieldsToTrack || Object.keys(newObj);
    
    for (const field of fields) {
      // Skip internal fields
      if (field.startsWith('_') || field === 'password' || field === 'createdAt' || field === 'updatedAt' || field === '__v') {
        continue;
      }

      const oldValue = oldObj[field];
      const newValue = newObj[field];

      // Compare values
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field,
          oldValue: this.sanitizeValue(oldValue),
          newValue: this.sanitizeValue(newValue)
        });
      }
    }

    return changes;
  }

  // Sanitize sensitive data
  private static sanitizeValue(value: any): any {
    if (value === undefined || value === null) return null;
    
    // Truncate long strings
    if (typeof value === 'string' && value.length > 500) {
      return value.substring(0, 500) + '...';
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length > 10) {
        return `[Array with ${value.length} items]`;
      }
      return value.map(v => this.sanitizeValue(v));
    }

    // Handle objects
    if (typeof value === 'object') {
      // Convert ObjectId to string
      if (value._id) {
        return value._id.toString();
      }
      return JSON.stringify(value);
    }

    return value;
  }

  // Get audit logs with filters
  static async getLogs(filters: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const {
        userId,
        entityType,
        entityId,
        action,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters;

      const query: any = {};

      if (userId) query.userId = userId;
      if (entityType) query.entityType = entityType;
      if (entityId) query.entityId = entityId;
      if (action) query.action = action;
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('userId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs: logs.map((log: any) => ({
          id: log._id.toString(),
          user: {
            id: log.userId?._id?.toString() || log.userId?.toString(),
            name: log.userName || (log.userId ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() : 'System'),
            email: log.userEmail || log.userId?.email,
            role: log.userRole
          },
          action: log.action,
          entity: {
            type: log.entityType,
            id: log.entityId,
            name: log.entityName
          },
          changes: log.changes || [],
          metadata: log.metadata || {},
          description: log.description,
          createdAt: log.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(
        `Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Get statistics
  static async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const query: any = {};
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const [
        total,
        byAction,
        byEntityType,
        byUser
      ] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$action', count: { $sum: 1 } } }
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$entityType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        AuditLog.aggregate([
          { $match: { ...query, userId: { $exists: true } } },
          { $group: { _id: '$userId', count: { $sum: 1 }, userName: { $first: '$userName' } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ])
      ]);

      return {
        total,
        byAction: byAction.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byEntityType: byEntityType.map((item: any) => ({
          entityType: item._id,
          count: item.count
        })),
        topUsers: byUser.map((item: any) => ({
          userId: item._id?.toString(),
          userName: item.userName || 'Unknown',
          activityCount: item.count
        }))
      };
    } catch (error) {
      throw new Error(
        `Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

