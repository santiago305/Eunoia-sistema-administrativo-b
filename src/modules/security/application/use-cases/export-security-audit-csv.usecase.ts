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
      .addSelect("COALESCE(v.request_id, '')", 'requestId')
      .addSelect("COALESCE(v.actor, '')", 'actor')
      .addSelect("COALESCE(v.throttler_name, '')", 'throttlerName')
      .addSelect("COALESCE(v.tracker_type, '')", 'trackerType')
      .addSelect("COALESCE(v.tracker_key_hash, '')", 'trackerKeyHash')
      .addSelect("COALESCE(v.user_id, '')", 'userId')
      .addSelect("COALESCE(v.session_id, '')", 'sessionId')
      .addSelect('v.total_hits', 'totalHits')
      .addSelect('v.request_limit', 'requestLimit')
      .addSelect('v.window_seconds', 'windowSeconds')
      .addSelect('v.retry_after_seconds', 'retryAfterSeconds')
      .addSelect('v.counted_for_ban', 'countedForBan')
      .addSelect('v.ban_level_after', 'banLevelAfter')
      .addSelect('v.banned_until_after', 'bannedUntilAfter')
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
        requestId: string;
        actor: string;
        throttlerName: string;
        trackerType: string;
        trackerKeyHash: string;
        userId: string;
        sessionId: string;
        totalHits: string | null;
        requestLimit: string | null;
        windowSeconds: string | null;
        retryAfterSeconds: string | null;
        countedForBan: boolean;
        banLevelAfter: string | null;
        bannedUntilAfter: string | null;
      }>();

    const header = [
      'createdAt',
      'createdAtLocal',
      'ip',
      'reason',
      'path',
      'method',
      'requestId',
      'actor',
      'throttlerName',
      'trackerType',
      'trackerKeyHash',
      'userId',
      'sessionId',
      'totalHits',
      'requestLimit',
      'windowSeconds',
      'retryAfterSeconds',
      'countedForBan',
      'banLevelAfter',
      'bannedUntilAfter',
      'userAgent',
    ];
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
          row.requestId ?? '',
          row.actor ?? '',
          row.throttlerName ?? '',
          row.trackerType ?? '',
          row.trackerKeyHash ?? '',
          row.userId ?? '',
          row.sessionId ?? '',
          row.totalHits ?? '',
          row.requestLimit ?? '',
          row.windowSeconds ?? '',
          row.retryAfterSeconds ?? '',
          row.countedForBan ?? false,
          row.banLevelAfter ?? '',
          row.bannedUntilAfter ?? '',
          row.userAgent ?? '',
        ]
          .map((value) => toCsvValue(value))
          .join(','),
      ),
    ];

    return lines.join('\n');
  }
}
