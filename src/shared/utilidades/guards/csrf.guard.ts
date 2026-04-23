import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SKIP_CSRF_KEY } from 'src/shared/utilidades/decorators/skip-csrf.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (shouldSkip || !this.requiresProtection(req)) {
      return true;
    }

    const csrfCookie = req.cookies?.csrf_token;
    const csrfHeader = req.headers['x-csrf-token'];
    const tokenFromHeader = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

    if (!csrfCookie || !tokenFromHeader || csrfCookie !== tokenFromHeader) {
      throw new ForbiddenException('CSRF token invalido o ausente');
    }

    return true;
  }

  private requiresProtection(req: Request): boolean {
    const method = req.method?.toUpperCase();
    const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

    if (!method || !unsafeMethods.has(method)) {
      return false;
    }

    const hasSessionCookie = Boolean(req.cookies?.access_token || req.cookies?.refresh_token);
    return hasSessionCookie;
  }
}

