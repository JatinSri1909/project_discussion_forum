import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No authentication token provided',
          code: 'AUTH_NO_TOKEN'
        }
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authentication token',
          code: 'AUTH_INVALID_TOKEN'
        }
      });
    }

    // Get additional user data including admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email!,
      isAdmin: userData?.is_admin || false
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      }
    });
  }
};