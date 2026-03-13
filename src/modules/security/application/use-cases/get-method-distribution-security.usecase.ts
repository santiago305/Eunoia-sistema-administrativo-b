import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { buildReasonFilter, resolveWindow, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetMethodDistributionSecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
  ) {}

  async execute(params: { hours?: number; reason?: string }) {
    const { from, to } = resolveWindow(params.hours);
    const reasonFilter = buildReasonFilter('v.reason', params.reason);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select("COALESCE(NULLIF(UPPER(v.method), ''), 'UNKNOWN')", 'method')
      .addSelect('COUNT(*)', 'count')
      .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
      .andWhere(reasonFilter.clause, reasonFilter.bind)
      .groupBy("COALESCE(NULLIF(UPPER(v.method), ''), 'UNKNOWN')")
      .orderBy('count', 'DESC')
      .getRawMany<{ method: string; count: string }>();

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      timeZone: SECURITY_TIMEZONE,
      data: rows.map((row) => ({
        method: row.method,
        count: Number(row.count) || 0,
      })),
    };
  }
}

