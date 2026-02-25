import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
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

type SupabaseJwtPayload = {
  sub: string;
  role?: string;
  app_metadata?: { role?: string };
};

type JwtPayloadWithSub = {
  sub: string;
  role?: string;
  app_metadata?: { role?: string };
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

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token || null;
}

function getUserFromBearer(
  token: string,
  secret: string,
  defaultRole: RequestUser['role'],
): RequestUser | null {
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as JwtPayloadWithSub;
    const id = payload.sub;
    if (!id) return null;
    const role: RequestUser['role'] =
      (payload.app_metadata?.role as RequestUser['role']) ??
      (payload.role as RequestUser['role']) ??
      defaultRole;
    return { id, role };
  } catch {
    return null;
  }
}

function getUserFromSupabaseBearer(req: Request): RequestUser | null {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;

  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as SupabaseJwtPayload;
    const id = payload.sub;
    if (!id) return null;
    const appRole = payload.app_metadata?.role;
    const supabaseRole = payload.role;
    const role: RequestUser['role'] =
      appRole === 'admin' || supabaseRole === 'service_role'
        ? 'admin'
        : appRole === 'provider'
          ? 'provider'
          : 'traveler';
    return { id, role };
  } catch {
    return null;
  }
}

function getUserFromProviderBearer(req: Request): RequestUser | null {
  const secret = process.env.PROVIDER_JWT_SECRET;
  if (!secret) return null;

  const token = getBearerToken(req);
  if (!token) return null;

  return getUserFromBearer(token, secret, 'provider');
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

    const pathname = (req.originalUrl ?? req.url ?? req.path ?? '').split('?')[0];
    const isProviderRoute = pathname.includes('/provider');

    if (!req.user) {
      // Use pathname so provider detection works with global prefix (e.g. /api/provider/...)
      const bearerUser = isProviderRoute
        ? getUserFromProviderBearer(req)
        : getUserFromSupabaseBearer(req);
      if (bearerUser) req.user = bearerUser;
    }

    const noSupabaseSecret = !process.env.SUPABASE_JWT_SECRET;
    const noProviderSecret = !process.env.PROVIDER_JWT_SECRET;
    const allowDevHeaders =
      process.env.NODE_ENV === 'development' &&
      (noSupabaseSecret || (isProviderRoute && noProviderSecret));
    if (!req.user && allowDevHeaders && typeof req.headers['x-user-id'] === 'string') {
      const id = req.headers['x-user-id'];
      const role = (req.headers['x-user-role'] ?? 'traveler') as RequestUser['role'];
      req.user = {
        id,
        role: role === 'admin' ? 'admin' : role === 'provider' ? 'provider' : 'traveler',
      };
    }

    next();
  }
}
