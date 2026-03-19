import { Request, Response, NextFunction } from 'express';

type HandlerFunction = (req: Request, res: Response, next: NextFunction) => Promise<any> | any;

export const wrapHandler = (handler: HandlerFunction) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
