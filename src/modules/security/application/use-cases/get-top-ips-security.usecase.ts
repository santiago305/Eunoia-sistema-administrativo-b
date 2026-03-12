import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { buildReasonFilter, formatLocalDateTime, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetTopIpsSecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
  ) {}

  async execute(params: { hours?: number; limit?: number; reason?: string }) {
    const requestedHours = Number.isFinite(params.hours) ? (params.hours as number) : 24;
    const requestedLimit = Number.isFinite(params.limit) ? (params.limit as number) : 20;
    const hours = Math.min(24 * 30, Math.max(1, requestedHours));
    const limit = Math.min(200, Math.max(1, requestedLimit));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const reasonFilter = buildReasonFilter('v.reason', params.reason);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select('v.ip', 'ip')
      .addSelect('COUNT(*)', 'violations')
      .addSelect('MAX(v.created_at)', 'lastViolationAt')
      .where('v.created_at >= :since', { since })
      .andWhere(reasonFilter.clause, reasonFilter.bind)
      .groupBy('v.ip')
      .orderBy('violations', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((row) => ({
      ...row,
      lastViolationAtLocal: formatLocalDateTime(row.lastViolationAt),
      timeZone: SECURITY_TIMEZONE,
    }));
  }
}

