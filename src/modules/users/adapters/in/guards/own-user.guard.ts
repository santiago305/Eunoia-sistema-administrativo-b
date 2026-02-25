import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class OwnUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { id?: string };
      params?: { id?: string };
    }>();

    const currentUserId = request.user?.id;
    const targetUserId = request.params?.id;

    if (!currentUserId || !targetUserId || currentUserId !== targetUserId) {
      throw new ForbiddenException('No puedes operar sobre otro usuario');
    }

    return true;
  }
}
