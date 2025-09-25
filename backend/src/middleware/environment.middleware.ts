import { Request, Response, NextFunction } from 'express';

export interface EnvironmentRequest extends Request {
  environment?: 'live' | 'test';
  user?: {
    environment_preference?: string;
  };
}

export const environmentMiddleware = (
  req: EnvironmentRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const envFromQuery = req.query.is_live;
    const envFromHeader = req.headers['x-environment'] as string;
    
    let environment: 'live' | 'test' = 'live';
    
    if (envFromQuery !== undefined) {
      environment = envFromQuery === 'true' ? 'live' : 'test';
    } else if (envFromHeader) {
      environment = envFromHeader === 'live' ? 'live' : 'test';
    } else if (req.user?.environment_preference) {
      environment = req.user.environment_preference as 'live' | 'test';
    }
    
    req.environment = environment;
    next();
  } catch (error) {
    console.error('Environment middleware error:', error);
    res.status(500).json({ 
      detail: 'Internal server error in environment processing' 
    });
  }
};