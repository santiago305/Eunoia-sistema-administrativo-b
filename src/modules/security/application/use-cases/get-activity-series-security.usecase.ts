import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { buildReasonFilter, formatLocalDateTime, GroupByGranularity, resolveWindow, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetActivitySeriesSecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
  ) {}

  async execute(params: { hours?: number; groupBy?: string; reason?: string }) {
    const { from, to, hours } = resolveWindow(params.hours);
    const groupBy = this.resolveGroupBy(params.groupBy, hours);
    const violationBucketExpr = this.getSqlBucketExpr('v.created_at', groupBy);
    const banBucketExpr = this.getSqlBucketExpr('b.updated_at', groupBy);
    const reasonFilter = buildReasonFilter('v.reason', params.reason);

    const [violationRows, banRows] = await Promise.all([
      this.violationRepository
        .createQueryBuilder('v')
        .select(violationBucketExpr, 'bucket')
        .addSelect('COUNT(*)', 'violations')
        .addSelect('COUNT(DISTINCT v.ip)', 'uniqueIps')
        .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
        .andWhere(reasonFilter.clause, reasonFilter.bind)
        .groupBy('bucket')
        .orderBy('bucket', 'ASC')
        .getRawMany<{ bucket: string; violations: string; uniqueIps: string }>(),
      this.banRepository
        .createQueryBuilder('b')
        .select(banBucketExpr, 'bucket')
        .addSelect('COUNT(*)', 'bans')
        .where('b.updated_at >= :from AND b.updated_at <= :to', { from, to })
        .andWhere('(b.manual_permanent_ban = true OR b.banned_until IS NOT NULL)')
        .groupBy('bucket')
        .orderBy('bucket', 'ASC')
        .getRawMany<{ bucket: string; bans: string }>(),
    ]);

    const violationMap = new Map(
      violationRows.map((row) => [
        this.toBucketKey(new Date(row.bucket), groupBy),
        {
          violations: Number(row.violations) || 0,
          uniqueIps: Number(row.uniqueIps) || 0,
        },
      ]),
    );

    const banMap = new Map(
      banRows.map((row) => [this.toBucketKey(new Date(row.bucket), groupBy), Number(row.bans) || 0]),
    );

    const timeline = this.buildTimeline(from, to, groupBy);
    const series = timeline.map((bucketDate) => {
      const key = this.toBucketKey(bucketDate, groupBy);
      const violationInfo = violationMap.get(key) ?? { violations: 0, uniqueIps: 0 };
      return {
        label: this.toBucketLabel(bucketDate, groupBy),
        violations: violationInfo.violations,
        bans: banMap.get(key) ?? 0,
        uniqueIps: violationInfo.uniqueIps,
      };
    });

    const enriched = series.map((item, index) => ({
      ...item,
      label: this.toBucketLabelShort(timeline[index], groupBy),
      bucketStart: timeline[index].toISOString(),
      bucketStartLocal: formatLocalDateTime(timeline[index]),
      bucketLabel: this.toBucketLabelWithDate(timeline[index], groupBy),
    }));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      timeZone: SECURITY_TIMEZONE,
      groupBy,
      bucketSize: this.getGroupByDescription(groupBy),
      data: enriched,
    };
  }

  private resolveGroupBy(groupBy?: string, hours = 24): GroupByGranularity {
    if (groupBy === 'day' || groupBy === 'hour' || groupBy === '30min' || groupBy === '15min' || groupBy === '5min') return groupBy;
    if (hours <= 1) return '5min';
    if (hours <= 6) return '15min';
    if (hours < 24) return '30min';
    return 'hour';
  }

  private getStepMinutes(groupBy: GroupByGranularity): number {
    if (groupBy === '5min') return 5;
    if (groupBy === '15min') return 15;
    if (groupBy === '30min') return 30;
    if (groupBy === 'hour') return 60;
    return 24 * 60;
  }

  private getSqlBucketExpr(field: string, groupBy: GroupByGranularity): string {
    if (groupBy === 'day' || groupBy === 'hour') return `DATE_TRUNC('${groupBy}', ${field})`;
    const bucketSeconds = this.getStepMinutes(groupBy) * 60;
    return `TO_TIMESTAMP(FLOOR(EXTRACT(EPOCH FROM ${field}) / ${bucketSeconds}) * ${bucketSeconds})`;
  }

  private alignToStep(date: Date, stepMinutes: number): Date {
    const aligned = new Date(date);
    if (stepMinutes >= 24 * 60) {
      aligned.setUTCHours(0, 0, 0, 0);
      return aligned;
    }

    const stepMs = stepMinutes * 60 * 1000;
    return new Date(Math.floor(aligned.getTime() / stepMs) * stepMs);
  }

  private buildTimeline(from: Date, to: Date, groupBy: GroupByGranularity): Date[] {
    const timeline: Date[] = [];
    const stepMinutes = this.getStepMinutes(groupBy);
    const cursor = this.alignToStep(from, stepMinutes);

    while (cursor <= to) {
      timeline.push(new Date(cursor));
      cursor.setUTCMinutes(cursor.getUTCMinutes() + stepMinutes);
    }

    return timeline;
  }

  private getZonedParts(date: Date): { year: string; month: string; day: string; hour: string } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: SECURITY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00';
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
  }

  private getZonedMinute(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: SECURITY_TIMEZONE, minute: '2-digit' }).formatToParts(date);
    return parts.find((part) => part.type === 'minute')?.value ?? '00';
  }

  private toBucketKey(date: Date, groupBy: GroupByGranularity): string {
    const { year, month, day, hour } = this.getZonedParts(date);
    if (groupBy === 'day') return `${year}-${month}-${day}`;
    if (groupBy === 'hour') return `${year}-${month}-${day}T${hour}`;
    return `${year}-${month}-${day}T${hour}:${this.getZonedMinute(date)}`;
  }

  private toBucketLabel(date: Date, groupBy: GroupByGranularity): string {
    if (groupBy === 'day') return this.toDayLabel(date);
    if (groupBy === 'hour') return this.toHourLabel(date);
    return this.toMinuteLabel(date);
  }

  private toBucketLabelShort(date: Date, groupBy: GroupByGranularity): string {
    return this.toBucketLabel(date, groupBy);
  }

  private toBucketLabelWithDate(date: Date, _groupBy: GroupByGranularity): string {
    return this.toDateTimeLabel(date);
  }

  private toHourLabel(date: Date): string {
    return `${this.getZonedParts(date).hour}h`;
  }

  private toMinuteLabel(date: Date): string {
    const { hour } = this.getZonedParts(date);
    return `${hour}:${this.getZonedMinute(date)}`;
  }

  private toDayLabel(date: Date): string {
    const { year, month, day } = this.getZonedParts(date);
    return `${year}-${month}-${day}`;
  }

  private toDateTimeLabel(date: Date): string {
    const { year, month, day, hour } = this.getZonedParts(date);
    return `${year}-${month}-${day} ${hour}:${this.getZonedMinute(date)}`;
  }

  private getGroupByDescription(groupBy: GroupByGranularity): string {
    if (groupBy === '5min') return '5 minutes';
    if (groupBy === '15min') return '15 minutes';
    if (groupBy === '30min') return '30 minutes';
    if (groupBy === 'hour') return '1 hour';
    return '1 day';
  }
}

