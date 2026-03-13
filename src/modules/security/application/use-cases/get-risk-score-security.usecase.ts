import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { resolveRiskLevel, resolveWindow, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetRiskScoreSecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
  ) {}

  async execute(params: { hours?: number }) {
    const { from, to } = resolveWindow(params.hours);

    const [aggregate, activeBans, manualPermanentBans] = await Promise.all([
      this.violationRepository
        .createQueryBuilder('v')
        .select('COUNT(*)', 'violations')
        .addSelect('COUNT(DISTINCT v.ip)', 'uniqueIps')
        .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
        .getRawOne<{ violations: string; uniqueIps: string }>(),
      this.banRepository
        .createQueryBuilder('b')
        .where('b.banned_until IS NOT NULL AND b.banned_until > :now', { now: new Date() })
        .getCount(),
      this.banRepository
        .createQueryBuilder('b')
        .where('b.manual_permanent_ban = true')
        .getCount(),
    ]);

    const violations = Number(aggregate?.violations) || 0;
    const uniqueIps = Number(aggregate?.uniqueIps) || 0;

    const scoreFromViolations = Math.min(50, violations * 0.8);
    const scoreFromUniqueIps = Math.min(25, uniqueIps * 1.5);
    const scoreFromActiveBans = Math.min(15, activeBans * 3);
    const scoreFromManualBans = Math.min(10, manualPermanentBans * 4);
    const score = Math.min(
      100,
      Math.round(scoreFromViolations + scoreFromUniqueIps + scoreFromActiveBans + scoreFromManualBans),
    );

    const { level, label } = resolveRiskLevel(score);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      timeZone: SECURITY_TIMEZONE,
      data: {
        score,
        level,
        label,
      },
      metrics: {
        violations,
        uniqueIps,
        activeBans,
        manualPermanentBans,
      },
    };
  }
}

