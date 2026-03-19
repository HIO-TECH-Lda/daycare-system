// Vercel types are provided at runtime by @vercel/node
// Using any to avoid type errors during local development
type VercelRequest = any;
type VercelResponse = any;
import { app } from '../src/app';

// Initialize database connection
import { connectDB } from '../src/config/database';
import { validateEnvironmentVariables } from '../src/utils/envValidation';

let dbConnected = false;

// Connect to database on first request
const ensureDbConnection = async () => {
  if (!dbConnected) {
    if (validateEnvironmentVariables()) {
      await connectDB();
      dbConnected = true;
    }
  }
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Ensure database is connected
    await ensureDbConnection();
    
    // Handle the request with Express app
    // The Express app is compatible with Vercel's request/response objects
    return app(req as any, res as any);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : 'Something went wrong'
    });
  }
}

