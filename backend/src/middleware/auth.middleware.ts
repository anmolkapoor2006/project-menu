import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwttokenkey123!';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    email: string;
    role: 'SUPER_ADMIN' | 'RESTAURANT_ADMIN';
    restaurantId?: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role,
      restaurantId: decoded.restaurantId
    };
    next();
  });
}

export function requireRole(role: 'SUPER_ADMIN' | 'RESTAURANT_ADMIN') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} permission` });
    }

    next();
  };
}
