import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  companyId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // For demo purposes, accept any token
    // In production, verify JWT token here
    req.userId = 'demo-user-id';
    req.companyId = 'demo-company-id';
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
