import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/auditLogService';
import { runInBackground } from '../utils/background';

// Not audited: health/info endpoints (exact match) and auth endpoints that only handle
// credentials or tokens (prefix match). Profile and password changes are audited, with values redacted.
const EXCLUDED_EXACT = new Set(['/health', '/api/v1', '/api/v1/health']);
const EXCLUDED_PREFIXES = [
  '/api/v1/test',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/invite',
  '/api/v1/auth/accept-invite'
];

function isExcluded(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  return EXCLUDED_EXACT.has(clean) || EXCLUDED_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}

// Field names whose values must never be stored (passwords, tokens, secrets)
const SENSITIVE_KEY = /pass(word)?|token|secret/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[…]';
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [key, SENSITIVE_KEY.test(key) ? '[redacted]' : redact(v, depth + 1)])
    );
  }
  return value;
}

// Map HTTP methods to audit actions
const METHOD_TO_ACTION: { [key: string]: 'create' | 'read' | 'update' | 'delete' | null } = {
  'POST': 'create',
  'GET': 'read',
  'PUT': 'update',
  'PATCH': 'update',
  'DELETE': 'delete'
};

// Extract entity information from URL
function extractEntityInfo(url: string, _method: string): { type: string; id?: string } | null {
  // Remove query params
  const path = url.split('?')[0];
  
  // Common patterns: /api/v1/admin/{entity}/{id}
  const adminMatch = path.match(/\/api\/v1\/admin\/([^/]+)(?:\/([^/]+))?/);
  if (adminMatch) {
    const entityType = adminMatch[1];
    const entityId = adminMatch[2];
    
    // Skip stats and export endpoints
    if (entityId === 'stats' || entityId === 'export' || entityId === 'statistics') {
      return null;
    }
    
    return {
      type: entityType.replace(/-/g, '_'), // Convert kebab-case to snake_case
      id: entityId && entityId !== 'undefined' ? entityId : undefined
    };
  }
  
  // Pattern: /api/v1/{entity}/{id}
  const publicMatch = path.match(/\/api\/v1\/([^/]+)(?:\/([^/]+))?/);
  if (publicMatch) {
    const entityType = publicMatch[1];
    const entityId = publicMatch[2];
    
    return {
      type: entityType.replace(/-/g, '_'),
      id: entityId && entityId !== 'undefined' ? entityId : undefined
    };
  }
  
  return null;
}

// Middleware to automatically log operations
export const auditLogMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Skip excluded routes
  if (isExcluded(req.path)) {
    return next();
  }
  
  // Skip GET requests (read operations) - uncomment to log reads
  // if (req.method === 'GET') {
  //   return next();
  // }
  
  const action = METHOD_TO_ACTION[req.method];
  if (!action || action === 'read') {
    return next();
  }
  
  // Extract entity info
  const entityInfo = extractEntityInfo(req.originalUrl, req.method);
  if (!entityInfo) {
    return next();
  }
  
  // Store original response methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  // Intercept the response to log after success. res.json() calls res.send() internally,
  // so only the first call logs.
  let logged = false;
  const logOnce = (data: any) => {
    // Only log successful operations (2xx status codes)
    if (logged || res.statusCode < 200 || res.statusCode >= 300) return;
    logged = true;
    // Log after the response, without blocking it (kept alive on Vercel)
    runInBackground('audit log', () => logOperation(req, res, action, entityInfo, data));
  };

  res.json = function(data: any) {
    logOnce(data);
    return originalJson(data);
  };

  res.send = function(data: any) {
    logOnce(data);
    return originalSend(data);
  };
  
  next();
};

// Perform the actual logging
async function logOperation(
  req: Request,
  res: Response,
  action: 'create' | 'update' | 'delete',
  entityInfo: { type: string; id?: string },
  responseData: any
): Promise<void> {
  try {
    const user = (req as any).user;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Some responses wrap the entity, e.g. { user, inviteLink }
    const entity = responseData?.data?.user ?? responseData?.data;

    // Extract entity ID from response if not in URL
    let entityId = entityInfo.id;
    if (!entityId && entity) {
      entityId = entity._id || entity.id;
    }
    
    // Extract entity name from response
    let entityName: string | undefined;
    if (entity) {
      const data = entity;
      entityName = data.name || 
                   data.title || 
                   data.email || 
                   data.orderNumber || 
                   data.productName ||
                   data.storeName ||
                   (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined);
    }
    
    // Detect changes for update operations
    let changes;
    if (action === 'update' && req.body) {
      // Simple change detection from request body
      changes = Object.entries(req.body)
        .filter(([key]) => !['_id', 'createdAt', 'updatedAt', '__v'].includes(key))
        .map(([field, value]) => ({
          field,
          oldValue: null, // We don't have old value here
          newValue: SENSITIVE_KEY.test(field) ? '[redacted]' : redact(value)
        }));
    }
    
    await AuditLogService.log({
      userId: user?.userId,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : undefined,
      userEmail: user?.email,
      userRole: user?.role,
      action,
      entityType: entityInfo.type,
      entityId: entityId?.toString() || 'unknown',
      entityName,
      changes,
      description: generateDescription(action, entityInfo.type),
      metadata: {
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        userAgent: req.headers['user-agent'],
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode
      }
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the app
    console.error('Audit log middleware error:', error);
  }
}

// Generate description based on action and entity type
function generateDescription(action: string, entityType: string): string {
  const actionMap = {
    create: 'created',
    update: 'updated',
    delete: 'deleted'
  };
  
  const entityMap: { [key: string]: string } = {
    auth: 'Auth',
    users: 'User',
    classes: 'Class',
    children: 'Child',
    staff_assignments: 'Staff Assignment',
    guardians: 'Guardian',
    pickup_persons: 'Pickup Person',
    daily_reports: 'Daily Report',
    activities: 'Activity',
    report_photos: 'Report Photo',
    attendance: 'Attendance',
    calendar_events: 'Calendar Event',
    invoices: 'Invoice',
    payments: 'Payment',
    expense_categories: 'Expense Category',
    expenses: 'Expense',
    messages: 'Message',
    monthly_reports: 'Monthly Report'
  };
  
  const entity = entityMap[entityType] || entityType;
  const actionText = actionMap[action as keyof typeof actionMap] || action;
  
  return `${entity} ${actionText}`;
}

