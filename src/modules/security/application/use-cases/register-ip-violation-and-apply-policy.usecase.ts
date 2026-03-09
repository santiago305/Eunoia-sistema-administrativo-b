import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';

const VIOLATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const BAN_RULES_MINUTES = [15, 60, 24 * 60, 7 * 24 * 60];

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
  }): Promise<{ banLevel: number; bannedUntil: Date | null; manualPermanentBan: boolean }> {
    const ip = this.resolveClientIpUseCase.normalizeIp(params.ip);

    await this.violationRepository.save(
      this.violationRepository.create({
        ip,
        reason: params.reason,
        path: params.path ?? null,
        method: params.method ?? null,
        userAgent: params.userAgent ?? null,
      }),
    );

    let ban = await this.banRepository.findOne({ where: { ip } });
    if (!ban) {
      ban = this.banRepository.create({
        ip,
        banLevel: 0,
        bannedUntil: null,
        manualPermanentBan: false,
      });
    }

    if (ban.manualPermanentBan) {
      return {
        banLevel: ban.banLevel,
        bannedUntil: ban.bannedUntil,
        manualPermanentBan: true,
      };
    }

    const windowStart = new Date(Date.now() - VIOLATION_WINDOW_MS);
    const violationsInWindow = await this.violationRepository.count({
      where: { ip, createdAt: MoreThanOrEqual(windowStart) },
    });

    const banLevel = Math.max(1, Math.min(4, violationsInWindow));
    const banMinutes = BAN_RULES_MINUTES[banLevel - 1];
    const proposedUntil = new Date(Date.now() + banMinutes * 60 * 1000);

    ban.banLevel = banLevel;
    ban.bannedUntil =
      ban.bannedUntil && ban.bannedUntil > proposedUntil ? ban.bannedUntil : proposedUntil;
    ban.lastReason = params.reason;

    const saved = await this.banRepository.save(ban);
    return {
      banLevel: saved.banLevel,
      bannedUntil: saved.bannedUntil,
      manualPermanentBan: saved.manualPermanentBan,
    };
  }
}

