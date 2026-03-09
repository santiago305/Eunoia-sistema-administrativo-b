import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';

type GroupByGranularity = '5min' | '15min' | '30min' | 'hour' | 'day';
const SECURITY_TIMEZONE = 'America/Lima';

@Injectable()
export class GetIpSecurityInsightsUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
  ) {}

  async getTopIps(params: { hours?: number; limit?: number }) {
    const requestedHours = Number.isFinite(params.hours) ? (params.hours as number) : 24;
    const requestedLimit = Number.isFinite(params.limit) ? (params.limit as number) : 20;
    const hours = Math.min(24 * 30, Math.max(1, requestedHours));
    const limit = Math.min(200, Math.max(1, requestedLimit));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select('v.ip', 'ip')
      .addSelect('COUNT(*)', 'violations')
      .addSelect('MAX(v.created_at)', 'lastViolationAt')
      .where('v.created_at >= :since', { since })
      .groupBy('v.ip')
      .orderBy('violations', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((row) => ({
      ...row,
      lastViolationAtLocal: this.formatLocalDateTime(row.lastViolationAt),
      timeZone: SECURITY_TIMEZONE,
    }));
  }

  async getActiveBans() {
    const rows = await this.banRepository
      .createQueryBuilder('b')
      .where('b.manual_permanent_ban = :permanent', { permanent: true })
      .orWhere('b.banned_until IS NOT NULL AND b.banned_until > :now', { now: new Date() })
      .orderBy('b.updated_at', 'DESC')
      .getMany();

    return rows.map((ban) => ({
      ...ban,
      createdAtLocal: this.formatLocalDateTime(ban.createdAt),
      updatedAtLocal: this.formatLocalDateTime(ban.updatedAt),
      bannedUntilLocal: this.formatLocalDateTime(ban.bannedUntil),
      timeZone: SECURITY_TIMEZONE,
    }));
  }

  async getIpHistory(ip: string, limit = 100) {
    const normalizedIp = this.resolveClientIpUseCase.normalizeIp(ip);
    const requestedLimit = Number.isFinite(limit) ? limit : 100;
    const safeLimit = Math.min(500, Math.max(1, requestedLimit));
    const [ban, violations] = await Promise.all([
      this.banRepository.findOne({ where: { ip: normalizedIp } }),
      this.violationRepository.find({
        where: { ip: normalizedIp },
        order: { createdAt: 'DESC' },
        take: safeLimit,
      }),
    ]);

    return {
      ip: normalizedIp,
      timeZone: SECURITY_TIMEZONE,
      ban: ban
        ? {
            ...ban,
            createdAtLocal: this.formatLocalDateTime(ban.createdAt),
            updatedAtLocal: this.formatLocalDateTime(ban.updatedAt),
            bannedUntilLocal: this.formatLocalDateTime(ban.bannedUntil),
          }
        : null,
      violations: violations.map((violation) => ({
        ...violation,
        createdAtLocal: this.formatLocalDateTime(violation.createdAt),
      })),
    };
  }

  async getActivitySeries(params: { hours?: number; groupBy?: string }) {
    const { from, to, hours } = this.resolveWindow(params.hours);
    const groupBy = this.resolveGroupBy(params.groupBy, hours);
    const violationBucketExpr = this.getSqlBucketExpr('v.created_at', groupBy);
    const banBucketExpr = this.getSqlBucketExpr('b.updated_at', groupBy);

    const [violationRows, banRows] = await Promise.all([
      this.violationRepository
        .createQueryBuilder('v')
        .select(violationBucketExpr, 'bucket')
        .addSelect('COUNT(*)', 'violations')
        .addSelect('COUNT(DISTINCT v.ip)', 'uniqueIps')
        .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
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

    return this.buildActivitySeriesPayload({ from, to, groupBy, series, timeline });
  }

  async getReasonDistribution(params: { hours?: number }) {
    const { from, to } = this.resolveWindow(params.hours);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select('v.reason', 'name')
      .addSelect('COUNT(*)', 'value')
      .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
      .groupBy('v.reason')
      .orderBy('value', 'DESC')
      .getRawMany<{ name: string; value: string }>();

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      timeZone: SECURITY_TIMEZONE,
      data: rows.map((row) => ({
        key: row.name,
        name: row.name,
        label: this.humanizeReason(row.name),
        value: Number(row.value) || 0,
      })),
    };
  }

  async getMethodDistribution(params: { hours?: number }) {
    const { from, to } = this.resolveWindow(params.hours);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select("COALESCE(NULLIF(UPPER(v.method), ''), 'UNKNOWN')", 'method')
      .addSelect('COUNT(*)', 'count')
      .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
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

  async getTopRoutes(params: { hours?: number; limit?: number }) {
    const { from, to } = this.resolveWindow(params.hours);
    const requestedLimit = Number.isFinite(params.limit) ? (params.limit as number) : 5;
    const limit = Math.min(100, Math.max(1, requestedLimit));

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select("COALESCE(NULLIF(v.path, ''), 'unknown')", 'path')
      .addSelect('COUNT(*)', 'count')
      .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
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

  async getRiskScore(params: { hours?: number }) {
    const { from, to } = this.resolveWindow(params.hours);

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

    const { level, label } = this.resolveRiskLevel(score);

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

  private resolveWindow(hours?: number) {
    const requestedHours = Number.isFinite(hours) ? (hours as number) : 24;
    const safeHours = Math.min(24 * 30, Math.max(1, requestedHours));
    const to = new Date();
    const from = new Date(to.getTime() - safeHours * 60 * 60 * 1000);
    return { from, to, hours: safeHours };
  }

  private resolveGroupBy(groupBy?: string, hours = 24): GroupByGranularity {
    if (groupBy === 'day' || groupBy === 'hour' || groupBy === '30min' || groupBy === '15min' || groupBy === '5min') {
      return groupBy;
    }

    if (hours <= 1) return '5min';
    if (hours <= 6) return '15min';
    if (hours < 24) return '30min';
    return 'hour';
  }

  private toBucketKey(date: Date, groupBy: GroupByGranularity): string {
    const { year, month, day, hour } = this.getZonedParts(date);

    if (groupBy === 'day') {
      return `${year}-${month}-${day}`;
    }

    if (groupBy === 'hour') {
      return `${year}-${month}-${day}T${hour}`;
    }

    const minute = this.getZonedMinute(date);
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private getZonedMinute(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: SECURITY_TIMEZONE,
      minute: '2-digit',
    }).formatToParts(date);
    return parts.find((part) => part.type === 'minute')?.value ?? '00';
  }

  private getStepMinutes(groupBy: GroupByGranularity): number {
    if (groupBy === '5min') return 5;
    if (groupBy === '15min') return 15;
    if (groupBy === '30min') return 30;
    if (groupBy === 'hour') return 60;
    return 24 * 60;
  }

  private getSqlBucketExpr(field: string, groupBy: GroupByGranularity): string {
    if (groupBy === 'day' || groupBy === 'hour') {
      return `DATE_TRUNC('${groupBy}', ${field})`;
    }

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
    const floored = Math.floor(aligned.getTime() / stepMs) * stepMs;
    return new Date(floored);
  }

  private toHourLabel(date: Date): string {
    const { hour } = this.getZonedParts(date);
    return `${hour}h`;
  }

  private toMinuteLabel(date: Date): string {
    const { hour } = this.getZonedParts(date);
    const minute = this.getZonedMinute(date);
    return `${hour}:${minute}`;
  }

  private toDayLabel(date: Date): string {
    const { year, month, day } = this.getZonedParts(date);
    return `${year}-${month}-${day}`;
  }

  private toDateTimeLabel(date: Date): string {
    const { year, month, day, hour } = this.getZonedParts(date);
    const minute = this.getZonedMinute(date);
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  private toBucketLabel(date: Date, groupBy: GroupByGranularity): string {
    if (groupBy === 'day') return this.toDayLabel(date);
    if (groupBy === 'hour') return this.toHourLabel(date);
    return this.toMinuteLabel(date);
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

  private getGroupByDescription(groupBy: GroupByGranularity): string {
    if (groupBy === '5min') return '5 minutes';
    if (groupBy === '15min') return '15 minutes';
    if (groupBy === '30min') return '30 minutes';
    if (groupBy === 'hour') return '1 hour';
    return '1 day';
  }

  private toBucketLabelWithDate(date: Date, groupBy: GroupByGranularity): string {
    if (groupBy === 'day') return this.toDayLabel(date);
    if (groupBy === 'hour') return this.toDateTimeLabel(date);
    return this.toDateTimeLabel(date);
  }

  private toBucketLabelShort(date: Date, groupBy: GroupByGranularity): string {
    if (groupBy === 'day') return this.toDayLabel(date);
    if (groupBy === 'hour') return this.toHourLabel(date);
    return this.toMinuteLabel(date);
  }

  private toActivityItemLabel(date: Date, groupBy: GroupByGranularity): string {
    return this.toBucketLabelShort(date, groupBy);
  }

  private toActivityItemBucketStart(date: Date): string {
    return date.toISOString();
  }

  private enrichActivitySeriesData(
    series: Array<{ label: string; violations: number; bans: number; uniqueIps: number }>,
    timeline: Date[],
    groupBy: GroupByGranularity,
  ) {
    return series.map((item, index) => ({
      ...item,
      label: this.toActivityItemLabel(timeline[index], groupBy),
      bucketStart: this.toActivityItemBucketStart(timeline[index]),
      bucketStartLocal: this.formatLocalDateTime(timeline[index]),
      bucketLabel: this.toBucketLabelWithDate(timeline[index], groupBy),
    }));
  }

  private buildActivitySeriesPayload(params: {
    from: Date;
    to: Date;
    groupBy: GroupByGranularity;
    series: Array<{ label: string; violations: number; bans: number; uniqueIps: number }>;
    timeline: Date[];
  }) {
    const enriched = this.enrichActivitySeriesData(params.series, params.timeline, params.groupBy);
    return {
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      generatedAt: new Date().toISOString(),
      timeZone: SECURITY_TIMEZONE,
      groupBy: params.groupBy,
      bucketSize: this.getGroupByDescription(params.groupBy),
      data: enriched,
    };
  }


  private humanizeReason(reason: string): string {
    return (reason || 'unknown')
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveRiskLevel(score: number): { level: 'LOW' | 'MEDIUM' | 'HIGH'; label: string } {
    if (score >= 67) return { level: 'HIGH', label: 'Alto' };
    if (score >= 34) return { level: 'MEDIUM', label: 'Medio' };
    return { level: 'LOW', label: 'Bajo' };
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
    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
    };
  }

  private formatLocalDateTime(value: Date | string | null | undefined): string | null {
    if (!value) return null;

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: SECURITY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }
}

