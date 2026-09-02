import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { SecurityReasonCatalog } from '../../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';
import { formatLocalDateTime, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetIpHistorySecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
    @InjectRepository(SecurityReasonCatalog)
    private readonly reasonCatalogRepository: Repository<SecurityReasonCatalog>,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
  ) {}

  async execute(ip: string, limit = 100) {
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
    const reasonKeys = Array.from(new Set(violations.map((item) => item.reason)));
    const reasons = reasonKeys.length
      ? await this.reasonCatalogRepository.find({ where: { key: In(reasonKeys) } })
      : [];
    const reasonByKey = new Map(reasons.map((item) => [item.key, item]));

    return {
      ip: normalizedIp,
      timeZone: SECURITY_TIMEZONE,
      ban: ban
        ? {
            ...ban,
            createdAtLocal: formatLocalDateTime(ban.createdAt),
            updatedAtLocal: formatLocalDateTime(ban.updatedAt),
            bannedUntilLocal: formatLocalDateTime(ban.bannedUntil),
          }
        : null,
      violations: violations.map((violation) => ({
        ...violation,
        reasonLabel: reasonByKey.get(violation.reason)?.label ?? violation.reason,
        reasonDescription:
          reasonByKey.get(violation.reason)?.description ?? null,
        createdAtLocal: formatLocalDateTime(violation.createdAt),
        bannedUntilAfterLocal: formatLocalDateTime(
          violation.bannedUntilAfter,
        ),
      })),
    };
  }
}
