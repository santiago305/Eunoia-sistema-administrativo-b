import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ResolveClientIpUseCase } from 'src/modules/security/application/use-cases/resolve-client-ip.usecase';
import { CheckIpBanUseCase } from 'src/modules/security/application/use-cases/check-ip-ban.usecase';
import { RecordIpViolationUseCase } from 'src/modules/security/application/use-cases/record-ip-violation.usecase';
import { SecurityForbiddenApplicationError } from 'src/modules/security/application/errors/security-forbidden.error';
import { randomUUID } from 'crypto';

@Injectable()
export class IpBanGuard implements CanActivate {
  constructor(
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
    private readonly checkIpBanUseCase: CheckIpBanUseCase,
    private readonly recordIpViolationUseCase: RecordIpViolationUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse();
    const ip = this.resolveClientIpUseCase.execute(req);
    const status = await this.checkIpBanUseCase.execute(ip);

    if (!status.blocked) return true;

    const requestIdHeader = req.headers['x-request-id'];
    const requestIdValue = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader;
    const requestId = requestIdValue?.trim().slice(0, 120) || randomUUID();
    const reason = status.ban?.manualPermanentBan
      ? 'manual_permanent_ban_request'
      : 'temporary_ban_request';
    res.setHeader('X-Request-ID', requestId);

    await this.recordIpViolationUseCase.execute({
      ip,
      reason,
      path: req.path,
      method: req.method,
      userAgent: Array.isArray(req.headers['user-agent'])
        ? req.headers['user-agent'][0]
        : req.headers['user-agent'],
      requestId,
      countedForBan: false,
      banLevelAfter: status.ban?.banLevel,
      bannedUntilAfter: status.ban?.bannedUntil ?? null,
    });

    throw new ForbiddenException(
      {
        type: 'IP_BLOCKED',
        message: new SecurityForbiddenApplicationError(
          status.ban?.manualPermanentBan
            ? 'Esta dirección IP tiene un bloqueo permanente aplicado por seguridad.'
            : 'Esta dirección IP está bloqueada temporalmente por exceso reiterado de solicitudes.',
        ).message,
        details: {
          requestId,
          reason,
          banLevel: status.ban?.banLevel ?? 0,
          bannedUntil: status.ban?.bannedUntil?.toISOString() ?? null,
          method: req.method,
          path: req.path,
        },
      },
    );
  }
}
