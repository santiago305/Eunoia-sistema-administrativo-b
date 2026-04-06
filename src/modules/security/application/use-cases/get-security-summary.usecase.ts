import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { resolveWindow, SECURITY_TIMEZONE } from './security-insights.utils';

const SECURITY_SUMMARY_TOP_IPS_LIMIT = 5;

@Injectable()
export class GetSecuritySummaryUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
  ) {}

  async execute(params: { hours?: number }) {
    const { from, to } = resolveWindow(params.hours);
    const now = new Date();

    const [topViolationsRow, activeBans, temporaryBans, permanentBans] = await Promise.all([
      this.violationRepository
        .createQueryBuilder('v')
        .select('COALESCE(SUM(top_ip.total), 0)', 'topViolations')
        .from((subQuery) => {
          return subQuery
            .select('v.ip', 'ip')
            .addSelect('COUNT(*)', 'total')
            .from(IpViolation, 'v')
            .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
            .groupBy('v.ip')
            .orderBy('COUNT(*)', 'DESC')
            .limit(SECURITY_SUMMARY_TOP_IPS_LIMIT);
        }, 'top_ip')
        .getRawOne<{ topViolations: string }>(),
      this.banRepository
        .createQueryBuilder('b')
        .where('b.manual_permanent_ban = true')
        .orWhere('b.banned_until IS NOT NULL AND b.banned_until > :now', { now })
        .getCount(),
      this.banRepository
        .createQueryBuilder('b')
        .where('b.manual_permanent_ban = false')
        .andWhere('b.banned_until IS NOT NULL AND b.banned_until > :now', { now })
        .getCount(),
      this.banRepository
        .createQueryBuilder('b')
        .where('b.manual_permanent_ban = true')
        .getCount(),
    ]);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      timeZone: SECURITY_TIMEZONE,
      data: {
        topViolations: Number(topViolationsRow?.topViolations) || 0,
        activeBans,
        temporaryBans,
        permanentBans,
      },
    };
  }
}
