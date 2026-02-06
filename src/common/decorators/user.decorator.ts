import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type UserRole = 'traveler' | 'provider' | 'admin';

export interface RequestUser {
  id: string;
  role: UserRole;
}

export const User = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) return null as unknown as RequestUser;
    return data ? user[data] : user;
  },
);
