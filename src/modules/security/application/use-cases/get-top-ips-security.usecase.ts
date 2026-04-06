import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { buildReasonFilter, formatLocalDateTime, SECURITY_TIMEZONE } from './security-insights.utils';

type TopIpsSortBy = 'violations' | 'lastViolationAt' | 'ip';
type TopIpsSortOrder = 'ASC' | 'DESC';

@Injectable()
export class GetTopIpsSecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
  ) {}

  async execute(params: {
    hours?: number;
    page?: number;
    limit?: number;
    reason?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const requestedHours = Number.isFinite(params.hours) ? (params.hours as number) : 24;
    const requestedPage = Number.isFinite(params.page) ? (params.page as number) : 1;
    const requestedLimit = Number.isFinite(params.limit) ? (params.limit as number) : 20;

    const hours = Math.min(24 * 30, Math.max(1, requestedHours));
    const page = Math.max(1, requestedPage);
    const limit = Math.min(200, Math.max(1, requestedLimit));
    const offset = (page - 1) * limit;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const reasonFilter = buildReasonFilter('v.reason', params.reason);

    const normalizedSortBy = this.resolveSortBy(params.sortBy);
    const normalizedSortOrder = this.resolveSortOrder(params.sortOrder);

    const baseQuery = this.violationRepository
      .createQueryBuilder('v')
      .select('v.ip', 'ip')
      .addSelect('COUNT(*)', 'violations')
      .addSelect('MAX(v.created_at)', 'lastViolationAt')
      .where('v.created_at >= :since', { since })
      .andWhere(reasonFilter.clause, reasonFilter.bind)
      .groupBy('v.ip');

    const totalRow = await this.violationRepository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from(`(${baseQuery.getQuery()})`, 'top_ips')
      .setParameters(baseQuery.getParameters())
      .getRawOne<{ total: string }>();

    const rows = await baseQuery
      .clone()
      .orderBy(normalizedSortBy, normalizedSortOrder)
      .offset(offset)
      .limit(limit)
      .getRawMany();

    return {
      data: rows.map((row) => ({
        ip: row.ip,
        violations: Number(row.violations) || 0,
        lastViolationAt: row.lastViolationAt,
        lastViolationAtLocal: formatLocalDateTime(row.lastViolationAt),
        timeZone: SECURITY_TIMEZONE,
      })),
      pagination: {
        page,
        limit,
        total: Number(totalRow?.total) || 0,
      },
    };
  }

  private resolveSortBy(sortBy?: string): TopIpsSortBy {
    if (sortBy === 'ip') return 'ip';
    if (sortBy === 'lastViolationAt') return 'lastViolationAt';
    return 'violations';
  }

  private resolveSortOrder(sortOrder?: string): TopIpsSortOrder {
    return String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  }
}
