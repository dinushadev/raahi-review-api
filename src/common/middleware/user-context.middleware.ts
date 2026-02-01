import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestUser } from '../decorators/user.decorator';

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

type AuthorizerClaims = {
  sub?: string;
  role?: string;
  traveler_id?: string;
  admin_id?: string;
  jwt?: { claims?: Record<string, string> };
};

function getAuthorizerFromEvent(): AuthorizerClaims | undefined {
  try {
    const { getCurrentInvoke } = require('@vendia/serverless-express');
    const { event } = getCurrentInvoke?.() ?? {};
    const auth = event?.requestContext?.authorizer;
    if (auth?.jwt?.claims) return auth.jwt.claims as AuthorizerClaims;
    if (auth) return auth as AuthorizerClaims;
  } catch {
    // Not in Lambda or getCurrentInvoke not available
  }
  return undefined;
}

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const claims = getAuthorizerFromEvent();

    if (claims) {
      const id = claims.sub ?? claims.traveler_id ?? claims.admin_id;
      const role = (claims.role ?? 'traveler') as RequestUser['role'];
      if (id) {
        req.user = { id, role };
      }
    }

    if (!req.user && typeof req.headers['x-user-id'] === 'string') {
      const id = req.headers['x-user-id'];
      const role = (req.headers['x-user-role'] ?? 'traveler') as RequestUser['role'];
      req.user = { id, role: role === 'admin' ? 'admin' : 'traveler' };
    }

    next();
  }
}
