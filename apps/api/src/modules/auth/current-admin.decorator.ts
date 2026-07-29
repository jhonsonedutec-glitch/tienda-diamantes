import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminJwtPayload } from './jwt.strategy';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminJwtPayload => {
    return context.switchToHttp().getRequest().user as AdminJwtPayload;
  },
);
