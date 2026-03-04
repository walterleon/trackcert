import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
  company?: JwtPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    req.company = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const superAdminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.company?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Forbidden: super admin only' });
    return;
  }
  next();
};
