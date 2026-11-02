// Vercel serverless entry point: every request goes through the Express app.
// Vercel types are provided at runtime by @vercel/node
type VercelRequest = any;
type VercelResponse = any;
import { app } from '../src/app';
import { connectDB } from '../src/config/database';
import { validateEnvironmentVariables } from '../src/utils/envValidation';

// Checked once per function instance (logs what's missing)
const environmentValid = validateEnvironmentVariables();

// Plain Node response (doesn't rely on Vercel's res.status()/res.json() helpers)
function sendError(res: VercelResponse, status: number, message: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ success: false, message }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!environmentValid) {
    return sendError(res, 500, 'Servidor mal configurado');
  }

  try {
    // Reuses the connection of a warm instance
    await connectDB();
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    return sendError(res, 503, 'Serviço temporariamente indisponível. Tente novamente.');
  }

  return app(req, res);
}
