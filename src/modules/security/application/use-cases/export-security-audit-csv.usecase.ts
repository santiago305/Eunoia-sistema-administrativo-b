import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { buildReasonFilter, formatLocalDateTime, resolveWindow, toCsvValue } from './security-insights.utils';

@Injectable()
export class ExportSecurityAuditCsvUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
  ) {}

  async execute(params: { hours?: number; reason?: string }) {
    const { from, to } = resolveWindow(params.hours);
    const reasonFilter = buildReasonFilter('v.reason', params.reason);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select('v.created_at', 'createdAt')
      .addSelect('v.ip', 'ip')
      .addSelect('v.reason', 'reason')
      .addSelect("COALESCE(v.path, '')", 'path')
      .addSelect("COALESCE(v.method, '')", 'method')
      .addSelect("COALESCE(v.user_agent, '')", 'userAgent')
      .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
      .andWhere(reasonFilter.clause, reasonFilter.bind)
      .orderBy('v.created_at', 'DESC')
      .getRawMany<{
        createdAt: string;
        ip: string;
        reason: string;
        path: string;
        method: string;
        userAgent: string;
      }>();

    const header = ['createdAt', 'createdAtLocal', 'ip', 'reason', 'path', 'method', 'userAgent'];
    const lines = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.createdAt ?? '',
          formatLocalDateTime(row.createdAt) ?? '',
          row.ip ?? '',
          row.reason ?? '',
          row.path ?? '',
          row.method ?? '',
          row.userAgent ?? '',
        ]
          .map((value) => toCsvValue(value))
          .join(','),
      ),
    ];

    return lines.join('\n');
  }
}

