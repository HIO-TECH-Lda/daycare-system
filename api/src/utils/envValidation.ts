/**
 * Environment Variable Validation Utility
 * Validates required environment variables on application startup
 */

interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    description: string;
    defaultValue?: string;
  };
}

const requiredEnvVars: RequiredEnvVars = {
  NODE_ENV: {
    required: true,
    description: 'Application environment (development, production, test)',
    defaultValue: 'development'
  },
  PORT: {
    required: false,
    description: 'Server port',
    defaultValue: '3002'
  },
  MONGODB_URI: {
    required: true,
    description: 'MongoDB connection string'
  },
  JWT_SECRET: {
    required: true,
    description: 'Secret key for JWT tokens'
  },
  JWT_REFRESH_SECRET: {
    required: false,
    description: 'Separate secret for refresh tokens. Required in production.'
  },
  JWT_EXPIRES_IN: {
    required: false,
    description: 'JWT token expiration time',
    defaultValue: '7d'
  },
  JWT_REFRESH_EXPIRES_IN: {
    required: false,
    description: 'Refresh token expiration time',
    defaultValue: '30d'
  },
  CLOUDINARY_CLOUD_NAME: { required: false, description: 'Cloudinary cloud name for file uploads' },
  CLOUDINARY_API_KEY: { required: false, description: 'Cloudinary API key' },
  CLOUDINARY_API_SECRET: { required: false, description: 'Cloudinary API secret' },
  CLOUDINARY_FOLDER_NAME: {
    required: false,
    description: 'Cloudinary base folder name',
    defaultValue: 'sonho-de-crianca'
  },
  SMTP_HOST: { required: false, description: 'SMTP host', defaultValue: 'smtp.gmail.com' },
  SMTP_PORT: { required: false, description: 'SMTP port', defaultValue: '587' },
  SMTP_SECURE: { required: false, description: 'Use TLS (true/false)', defaultValue: 'false' },
  SMTP_USER: { required: false, description: 'SMTP username / sender address' },
  SMTP_PASS: { required: false, description: 'SMTP password or app password' },
  FRONTEND_URL: {
    required: false,
    description: 'Public URL of the frontend app (used in email links)',
    defaultValue: 'http://localhost:3000'
  },
  CORS_ORIGINS: {
    required: false,
    description: 'Comma-separated browser origins allowed to call the API (supports * wildcards). Required in production.'
  },
  // WhatsApp (Meta Cloud API)
  WHATSAPP_TOKEN: { required: false, description: 'Meta permanent system-user access token' },
  WHATSAPP_PHONE_ID: { required: false, description: 'Meta Phone Number ID (not the actual phone number)' },
  WHATSAPP_API_VERSION: { required: false, description: 'Meta Graph API version', defaultValue: 'v21.0' },
  WHATSAPP_LANG: { required: false, description: 'BCP 47 language code for WhatsApp templates', defaultValue: 'pt_BR' },
  // Optional: override default WhatsApp template names
  WA_TEMPLATE_INVITE: { required: false, description: 'WhatsApp template: account invite' },
  WA_TEMPLATE_WELCOME: { required: false, description: 'WhatsApp template: welcome' },
  WA_TEMPLATE_INVOICE_NEW: { required: false, description: 'WhatsApp template: new invoice' },
  WA_TEMPLATE_INVOICE_OVERDUE: { required: false, description: 'WhatsApp template: overdue invoice' },
  WA_TEMPLATE_INVOICE_PAID: { required: false, description: 'WhatsApp template: invoice paid' },
  WA_TEMPLATE_DAILY_REPORT: { required: false, description: 'WhatsApp template: daily report available' },
  WA_TEMPLATE_MONTHLY_REPORT: { required: false, description: 'WhatsApp template: monthly report validated' },
  WA_TEMPLATE_NEW_MESSAGE: { required: false, description: 'WhatsApp template: new message received' },
  WA_TEMPLATE_ATTENDANCE_CHECKIN: { required: false, description: 'WhatsApp template: child checked in' },
  WA_TEMPLATE_ATTENDANCE_CHECKOUT: { required: false, description: 'WhatsApp template: child checked out' },
  WA_TEMPLATE_PASSWORD_RESET: { required: false, description: 'WhatsApp template: password reset' }
};

export function validateEnvironmentVariables(): boolean {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Validating environment variables...');

  for (const [varName, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[varName];

    if (config.required && !value) {
      missingVars.push(varName);
    } else if (!value && config.defaultValue) {
      process.env[varName] = config.defaultValue;
      console.log(`⚠️  ${varName} not set, using default: ${config.defaultValue}`);
    } else if (!config.required && !value && config.description) {
      warnings.push(`${varName}: ${config.description}`);
    }
  }

  // Without its own secret, a 30-day refresh token would be signed with the access-token secret
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_REFRESH_SECRET) {
      missingVars.push('JWT_REFRESH_SECRET');
    } else if (process.env.JWT_REFRESH_SECRET === process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_REFRESH_SECRET should differ from JWT_SECRET.');
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      const config = requiredEnvVars[varName];
      console.error(`   ${varName}: ${config.description}`);
    });
    console.error('\nPlease set these variables in your .env file');
    return false;
  }

  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
    console.warn('⚠️  CORS_ORIGINS is not set: browsers will be blocked from calling the API in production.');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Optional environment variables not set:');
    warnings.forEach(warning => console.log(`   ${warning}`));
  }

  if (process.env.MONGODB_URI) {
    if (process.env.MONGODB_URI.includes('mongodb+srv://')) {
      console.log('✅ MongoDB Atlas connection string validated');
    } else if (process.env.MONGODB_URI.includes('mongodb://')) {
      console.log('✅ MongoDB connection string validated');
    } else {
      console.warn('⚠️  MongoDB URI format may be incorrect');
    }
  }

  console.log('✅ Environment variables validation completed');
  return true;
}

export function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback !== undefined) return fallback;
  if (!value) throw new Error(`Environment variable ${key} is required but not set`);
  return value;
}

export function getBoolEnvVar(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

export function getNumberEnvVar(key: string, fallback?: number): number {
  const value = process.env[key];
  if (!value && fallback !== undefined) return fallback;
  if (!value) throw new Error(`Environment variable ${key} is required but not set`);
  const num = parseInt(value, 10);
  if (isNaN(num)) throw new Error(`Environment variable ${key} must be a valid number`);
  return num;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

export function getEnvironment(): string {
  return process.env.NODE_ENV || 'development';
}
