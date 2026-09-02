import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { SecurityReasonCatalog } from '../../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { formatLocalDateTime, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetActiveBansSecurityUseCase {
  constructor(
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
    @InjectRepository(SecurityReasonCatalog)
    private readonly reasonCatalogRepository: Repository<SecurityReasonCatalog>,
  ) {}

  async execute(params?: { page?: number; limit?: number }) {
    const requestedPage = Number.isFinite(params?.page) ? Number(params?.page) : 1;
    const requestedLimit = Number.isFinite(params?.limit) ? Number(params?.limit) : 10;
    const page = Math.max(1, requestedPage);
    const limit = Math.min(100, Math.max(1, requestedLimit));

    const [rows, total] = await this.banRepository
      .createQueryBuilder('b')
      .where('b.manual_permanent_ban = :permanent', { permanent: true })
      .orWhere('b.banned_until IS NOT NULL AND b.banned_until > :now', { now: new Date() })
      .orderBy('b.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const reasonKeys = Array.from(
      new Set(rows.map((item) => item.lastReason).filter((item): item is string => Boolean(item))),
    );
    const reasons = reasonKeys.length
      ? await this.reasonCatalogRepository.find({ where: { key: In(reasonKeys) } })
      : [];
    const reasonByKey = new Map(reasons.map((item) => [item.key, item]));

    return {
      data: rows.map((ban) => ({
        ...ban,
        createdAtLocal: formatLocalDateTime(ban.createdAt),
        updatedAtLocal: formatLocalDateTime(ban.updatedAt),
        bannedUntilLocal: formatLocalDateTime(ban.bannedUntil),
        lastReasonLabel:
          reasonByKey.get(ban.lastReason ?? '')?.label ?? ban.lastReason,
        lastReasonDescription:
          reasonByKey.get(ban.lastReason ?? '')?.description ?? null,
        timeZone: SECURITY_TIMEZONE,
      })),
      total,
      page,
      limit,
    };
  }
}

