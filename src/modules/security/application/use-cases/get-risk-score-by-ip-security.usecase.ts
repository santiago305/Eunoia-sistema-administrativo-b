import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';
import { resolveFrontendRiskLabel, resolveRiskLevel, resolveWindow, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetRiskScoreByIpSecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
  ) {}

  async execute(params: { ip: string; hours?: number }) {
    const normalizedIp = this.resolveClientIpUseCase.normalizeIp(params.ip);
    const { from, to, hours } = resolveWindow(params.hours);

    const [violations, distinctReasons, activeBanRecord] = await Promise.all([
      this.violationRepository
        .createQueryBuilder('v')
        .where('v.ip = :ip', { ip: normalizedIp })
        .andWhere('v.created_at >= :from AND v.created_at <= :to', { from, to })
        .getCount(),
      this.violationRepository
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.reason)', 'count')
        .where('v.ip = :ip', { ip: normalizedIp })
        .andWhere('v.created_at >= :from AND v.created_at <= :to', { from, to })
        .getRawOne<{ count: string }>(),
      this.banRepository
        .createQueryBuilder('b')
        .where('b.ip = :ip', { ip: normalizedIp })
        .andWhere('(b.manual_permanent_ban = true OR (b.banned_until IS NOT NULL AND b.banned_until > :now))', {
          now: new Date(),
        })
        .getOne(),
    ]);

    const reasonsCount = Number(distinctReasons?.count) || 0;
    const hasActiveBan = Boolean(activeBanRecord);
    const isManualPermanentBan = Boolean(activeBanRecord?.manualPermanentBan);

    const scoreFromViolations = Math.min(60, violations * 3);
    const scoreFromReasons = Math.min(20, reasonsCount * 4);
    const scoreFromActiveBan = hasActiveBan ? 12 : 0;
    const scoreFromManualBan = isManualPermanentBan ? 8 : 0;
    const score = Math.min(
      100,
      Math.round(scoreFromViolations + scoreFromReasons + scoreFromActiveBan + scoreFromManualBan),
    );

    const { level, label } = resolveRiskLevel(score);

    return {
      ip: normalizedIp,
      score,
      level,
      label: resolveFrontendRiskLabel(label),
      windowHours: hours,
      generatedAt: new Date().toISOString(),
      details: {
        from: from.toISOString(),
        to: to.toISOString(),
        timeZone: SECURITY_TIMEZONE,
        metrics: {
          violations,
          distinctReasons: reasonsCount,
          hasActiveBan,
          isManualPermanentBan,
        },
        components: {
          fromViolations: scoreFromViolations,
          fromReasons: scoreFromReasons,
          fromActiveBan: scoreFromActiveBan,
          fromManualBan: scoreFromManualBan,
        },
      },
    };
  }
}

