import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';

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

    return this.violationRepository
      .createQueryBuilder('v')
      .select('v.ip', 'ip')
      .addSelect('COUNT(*)', 'violations')
      .addSelect('MAX(v.created_at)', 'lastViolationAt')
      .where('v.created_at >= :since', { since })
      .groupBy('v.ip')
      .orderBy('violations', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getActiveBans() {
    return this.banRepository
      .createQueryBuilder('b')
      .where('b.manual_permanent_ban = :permanent', { permanent: true })
      .orWhere('b.banned_until IS NOT NULL AND b.banned_until > :now', { now: new Date() })
      .orderBy('b.updated_at', 'DESC')
      .getMany();
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

    return { ip: normalizedIp, ban, violations };
  }
}

