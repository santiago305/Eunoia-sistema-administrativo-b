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

@Injectable()
export class IpBanGuard implements CanActivate {
  constructor(
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
    private readonly checkIpBanUseCase: CheckIpBanUseCase,
    private readonly recordIpViolationUseCase: RecordIpViolationUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = this.resolveClientIpUseCase.execute(req);
    const status = await this.checkIpBanUseCase.execute(ip);

    if (!status.blocked) return true;

    await this.recordIpViolationUseCase.execute({
      ip,
      reason: status.ban?.manualPermanentBan
        ? 'manual_permanent_ban_request'
        : 'temporary_ban_request',
      path: req.path,
      method: req.method,
      userAgent: Array.isArray(req.headers['user-agent'])
        ? req.headers['user-agent'][0]
        : req.headers['user-agent'],
    });

    throw new ForbiddenException(
      new SecurityForbiddenApplicationError(
        'IP bloqueada temporal o permanentemente',
      ).message,
    );
  }
}
