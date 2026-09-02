import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerRequest,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ResolveClientIpUseCase } from 'src/modules/security/application/use-cases/resolve-client-ip.usecase';
import { RegisterIpViolationAndApplyPolicyUseCase } from 'src/modules/security/application/use-cases/register-ip-violation-and-apply-policy.usecase';
import { RedisThrottlerStorage } from 'src/modules/security/infrastructure/providers/redis-throttler.storage';
import { createHash, randomUUID } from 'crypto';
import { ResolveRateLimitTrackerUseCase } from 'src/modules/security/application/use-cases/resolve-rate-limit-tracker.usecase';

@Injectable()
export class SecurityThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(SecurityThrottlerGuard.name);
  private readonly throttlerNameByRequest = new WeakMap<
    Request,
    Map<string, string>
  >();

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
    private readonly registerIpViolationAndApplyPolicyUseCase: RegisterIpViolationAndApplyPolicyUseCase,
    private readonly redisThrottlerStorage: RedisThrottlerStorage,
    private readonly resolveRateLimitTrackerUseCase: ResolveRateLimitTrackerUseCase,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Request): Promise<string> {
    return (await this.resolveRateLimitTrackerUseCase.executePrimary(req))
      .tracker;
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const req = requestProps.context.switchToHttp().getRequest<Request>();
    const identity =
      requestProps.throttler.name === 'ip-safety'
        ? this.resolveRateLimitTrackerUseCase.executeIp(req)
        : await this.resolveRateLimitTrackerUseCase.executePrimary(req);
    const names = this.throttlerNameByRequest.get(req) ?? new Map();
    names.set(identity.tracker, requestProps.throttler.name ?? 'default');
    this.throttlerNameByRequest.set(req, names);
    if (identity.trackerType === 'login') {
      await this.redisThrottlerStorage.linkTrackerToIp(
        identity.tracker,
        this.resolveClientIpUseCase.execute(req),
      );
    }

    return super.handleRequest({
      ...requestProps,
      getTracker: async () => identity.tracker,
    });
  }

  protected generateKey(
    context: ExecutionContext,
    tracker: string,
    name: string,
  ): string {
    const baseKey = super.generateKey(context, tracker, name);
    return `${baseKey}:${this.redisThrottlerStorage.buildTrackerKeySuffix(tracker)}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse();
    const ip = this.resolveClientIpUseCase.execute(req);
    const throttlerName = this.resolveThrottlerName(
      req,
      throttlerLimitDetail,
    );
    const trackerIdentity =
      this.resolveRateLimitTrackerUseCase.describeTracker(
        throttlerLimitDetail.tracker,
      );
    const isNewLimitExceeded = await this.redisThrottlerStorage.claimFirstBlockEvent(
      throttlerLimitDetail.key,
      throttlerName,
      throttlerLimitDetail.ttl,
    );
    const isSessionLimit = trackerIdentity.trackerType === 'session';
    const trackerScope = isSessionLimit
      ? 'tu sesión'
      : trackerIdentity.trackerType === 'login'
        ? 'esta cuenta desde la IP actual'
        : 'la IP compartida';
    const reason = isSessionLimit
      ? isNewLimitExceeded
        ? 'operator_rate_limit_exceeded'
        : 'operator_rate_limit_blocked_request'
      : isNewLimitExceeded
        ? 'rate_limit_exceeded'
        : 'rate_limit_blocked_request';
    const requestId = this.resolveRequestId(req);
    res.setHeader('X-Request-ID', requestId);

    const policy = await this.registerIpViolationAndApplyPolicyUseCase.execute({
      ip,
      reason,
      path: req.path,
      method: req.method,
      userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
      requestId,
      throttlerName,
      totalHits: throttlerLimitDetail.totalHits,
      requestLimit: throttlerLimitDetail.limit,
      windowSeconds: Math.ceil(throttlerLimitDetail.ttl / 1000),
      retryAfterSeconds: throttlerLimitDetail.timeToBlockExpire,
      trackerType: trackerIdentity.trackerType,
      trackerKeyHash: createHash('sha256')
        .update(throttlerLimitDetail.tracker)
        .digest('hex'),
      userId: trackerIdentity.userId ?? undefined,
      sessionId: trackerIdentity.sessionId ?? undefined,
    });

    this.logger.warn(
      JSON.stringify({
        event: reason,
        requestId,
        ip,
        method: req.method,
        path: req.path,
        throttlerName,
        trackerType: trackerIdentity.trackerType,
        userId: trackerIdentity.userId,
        sessionId: trackerIdentity.sessionId,
        totalHits: throttlerLimitDetail.totalHits,
        limit: throttlerLimitDetail.limit,
        retryAfterSeconds: throttlerLimitDetail.timeToBlockExpire,
        banLevel: policy.banLevel,
        bannedUntil: policy.bannedUntil?.toISOString() ?? null,
      }),
    );

    const retryAfterSeconds = Math.max(
      1,
      throttlerLimitDetail.timeToBlockExpire,
    );
    res.setHeader('Retry-After', retryAfterSeconds);
    throw new HttpException(
      {
        type: 'RATE_LIMIT_EXCEEDED',
        message:
          `Se alcanzó el límite de ${throttlerLimitDetail.limit} solicitudes ` +
          `en ${Math.ceil(throttlerLimitDetail.ttl / 1000)} segundos para ` +
          `${req.method} ${req.path} (${trackerScope}). ` +
          `Intenta nuevamente en ${retryAfterSeconds} segundos.`,
        details: {
          requestId,
          method: req.method,
          path: req.path,
          throttlerName,
          trackerType: trackerIdentity.trackerType,
          userId: trackerIdentity.userId,
          sessionId: trackerIdentity.sessionId,
          totalHits: throttlerLimitDetail.totalHits,
          limit: throttlerLimitDetail.limit,
          windowSeconds: Math.ceil(throttlerLimitDetail.ttl / 1000),
          retryAfterSeconds,
          countedAsNewViolation: isNewLimitExceeded,
          banLevel: policy.banLevel,
          bannedUntil: policy.bannedUntil?.toISOString() ?? null,
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private resolveRequestId(req: Request): string {
    const header = req.headers['x-request-id'];
    const value = Array.isArray(header) ? header[0] : header;
    return value?.trim().slice(0, 120) || randomUUID();
  }

  private resolveThrottlerName(
    req: Request,
    detail: ThrottlerLimitDetail,
  ): string {
    const requestName = this.throttlerNameByRequest
      .get(req)
      ?.get(detail.tracker);
    if (requestName) return requestName;

    const match = this.throttlers.find(
      (item) =>
        typeof item.limit === 'number' &&
        typeof item.ttl === 'number' &&
        item.limit === detail.limit &&
        item.ttl === detail.ttl,
    );
    return match?.name ?? 'default';
  }
}
