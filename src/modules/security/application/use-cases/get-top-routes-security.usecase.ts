import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { buildReasonFilter, resolveWindow, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetTopRoutesSecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
  ) {}

  async execute(params: { hours?: number; limit?: number; reason?: string }) {
    const { from, to } = resolveWindow(params.hours);
    const requestedLimit = Number.isFinite(params.limit) ? (params.limit as number) : 5;
    const limit = Math.min(100, Math.max(1, requestedLimit));
    const reasonFilter = buildReasonFilter('v.reason', params.reason);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select("COALESCE(NULLIF(v.path, ''), 'unknown')", 'path')
      .addSelect('COUNT(*)', 'count')
      .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
      .andWhere(reasonFilter.clause, reasonFilter.bind)
      .groupBy("COALESCE(NULLIF(v.path, ''), 'unknown')")
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ path: string; count: string }>();

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      timeZone: SECURITY_TIMEZONE,
      data: rows.map((row) => ({
        path: row.path,
        count: Number(row.count) || 0,
      })),
    };
  }
}

