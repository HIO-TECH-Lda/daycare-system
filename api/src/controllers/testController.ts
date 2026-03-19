import { Request, Response } from 'express';
import User from '../models/User';

export class TestController {
  static async testDatabase(_req: Request, res: Response) {
    try {
      const userCount = await User.countDocuments();
      res.json({
        success: true,
        message: 'Database connection successful',
        data: {
          userCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
