import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ResolveClientIpUseCase } from 'src/modules/security/application/use-cases/resolve-client-ip.usecase';
import { RegisterIpViolationAndApplyPolicyUseCase } from 'src/modules/security/application/use-cases/register-ip-violation-and-apply-policy.usecase';

@Injectable()
export class SecurityThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
    private readonly registerIpViolationAndApplyPolicyUseCase: RegisterIpViolationAndApplyPolicyUseCase,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Request): Promise<string> {
    return this.resolveClientIpUseCase.execute(req);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = this.resolveClientIpUseCase.execute(req);

    await this.registerIpViolationAndApplyPolicyUseCase.execute({
      ip,
      reason: 'rate_limit_exceeded',
      path: req.path,
      method: req.method,
      userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
    });

    throw new ThrottlerException(
      `Demasiadas solicitudes desde ${throttlerLimitDetail.tracker}. Intenta mas tarde.`,
    );
  }
}
