import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';

const VIOLATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_VIOLATIONS_BEFORE_TEMPORARY_BAN = 3;
const BAN_RULES_MINUTES = [15, 60, 24 * 60, 7 * 24 * 60];
const ESCALATING_VIOLATION_REASON = 'rate_limit_exceeded';

@Injectable()
export class RegisterIpViolationAndApplyPolicyUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
  ) {}

  async execute(params: {
    ip: string;
    reason: string;
    path?: string;
    method?: string;
    userAgent?: string;
    requestId?: string;
    throttlerName?: string;
    totalHits?: number;
    requestLimit?: number;
    windowSeconds?: number;
    retryAfterSeconds?: number;
    trackerType?: 'session' | 'login' | 'ip';
    trackerKeyHash?: string;
    userId?: string;
    sessionId?: string;
  }): Promise<{
    banLevel: number;
    bannedUntil: Date | null;
    manualPermanentBan: boolean;
  }> {
    const ip = this.resolveClientIpUseCase.normalizeIp(params.ip);

    const countedForBan = params.reason === ESCALATING_VIOLATION_REASON;
    const violation = await this.violationRepository.save(
      this.violationRepository.create({
        ip,
        reason: params.reason,
        path: params.path ?? null,
        method: params.method ?? null,
        userAgent: params.userAgent ?? null,
        requestId: params.requestId ?? null,
        throttlerName: params.throttlerName ?? null,
        totalHits: params.totalHits ?? null,
        requestLimit: params.requestLimit ?? null,
        windowSeconds: params.windowSeconds ?? null,
        retryAfterSeconds: params.retryAfterSeconds ?? null,
        trackerType: params.trackerType ?? null,
        trackerKeyHash: params.trackerKeyHash ?? null,
        userId: params.userId ?? null,
        sessionId: params.sessionId ?? null,
        countedForBan,
      }),
    );

    let ban = await this.banRepository.findOne({ where: { ip } });

    if (params.reason !== ESCALATING_VIOLATION_REASON) {
      await this.savePolicyResult(violation, ban);
      return {
        banLevel: ban?.banLevel ?? 0,
        bannedUntil: ban?.bannedUntil ?? null,
        manualPermanentBan: ban?.manualPermanentBan ?? false,
      };
    }

    if (!ban) {
      ban = this.banRepository.create({
        ip,
        banLevel: 0,
        bannedUntil: null,
        manualPermanentBan: false,
        policyResetAt: null,
      });
    }

    if (ban.manualPermanentBan) {
      await this.savePolicyResult(violation, ban);
      return {
        banLevel: ban.banLevel,
        bannedUntil: ban.bannedUntil,
        manualPermanentBan: true,
      };
    }

    const rollingWindowStart = new Date(Date.now() - VIOLATION_WINDOW_MS);
    const windowStart =
      ban.policyResetAt && ban.policyResetAt > rollingWindowStart
        ? ban.policyResetAt
        : rollingWindowStart;
    const violationsInWindow = await this.violationRepository.count({
      where: {
        ip,
        reason: ESCALATING_VIOLATION_REASON,
        createdAt: MoreThanOrEqual(windowStart),
      },
    });

    if (violationsInWindow < MIN_VIOLATIONS_BEFORE_TEMPORARY_BAN) {
      ban.banLevel = 0;
      ban.bannedUntil = null;
      ban.lastReason = params.reason;

      const saved = await this.banRepository.save(ban);
      await this.savePolicyResult(violation, saved);
      return {
        banLevel: saved.banLevel,
        bannedUntil: saved.bannedUntil,
        manualPermanentBan: saved.manualPermanentBan,
      };
    }

    const banLevel = Math.max(
      1,
      Math.min(4, violationsInWindow - MIN_VIOLATIONS_BEFORE_TEMPORARY_BAN + 1),
    );
    const banMinutes = BAN_RULES_MINUTES[banLevel - 1];
    const proposedUntil = new Date(Date.now() + banMinutes * 60 * 1000);

    ban.banLevel = banLevel;
    ban.bannedUntil =
      ban.bannedUntil && ban.bannedUntil > proposedUntil
        ? ban.bannedUntil
        : proposedUntil;
    ban.lastReason = params.reason;

    const saved = await this.banRepository.save(ban);
    await this.savePolicyResult(violation, saved);
    return {
      banLevel: saved.banLevel,
      bannedUntil: saved.bannedUntil,
      manualPermanentBan: saved.manualPermanentBan,
    };
  }

  private async savePolicyResult(
    violation: IpViolation,
    ban: IpBan | null,
  ): Promise<void> {
    violation.banLevelAfter = ban?.banLevel ?? 0;
    violation.bannedUntilAfter = ban?.bannedUntil ?? null;
    await this.violationRepository.save(violation);
  }
}
