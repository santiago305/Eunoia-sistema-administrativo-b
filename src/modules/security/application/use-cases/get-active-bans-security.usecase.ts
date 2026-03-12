import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { formatLocalDateTime, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetActiveBansSecurityUseCase {
  constructor(
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
  ) {}

  async execute() {
    const rows = await this.banRepository
      .createQueryBuilder('b')
      .where('b.manual_permanent_ban = :permanent', { permanent: true })
      .orWhere('b.banned_until IS NOT NULL AND b.banned_until > :now', { now: new Date() })
      .orderBy('b.updated_at', 'DESC')
      .getMany();

    return rows.map((ban) => ({
      ...ban,
      createdAtLocal: formatLocalDateTime(ban.createdAt),
      updatedAtLocal: formatLocalDateTime(ban.updatedAt),
      bannedUntilLocal: formatLocalDateTime(ban.bannedUntil),
      timeZone: SECURITY_TIMEZONE,
    }));
  }
}

