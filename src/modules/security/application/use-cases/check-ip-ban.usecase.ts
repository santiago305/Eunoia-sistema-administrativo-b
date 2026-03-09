import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';

@Injectable()
export class CheckIpBanUseCase {
  constructor(
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
  ) {}

  async execute(ip: string): Promise<{ blocked: boolean; ban: IpBan | null }> {
    const normalizedIp = this.resolveClientIpUseCase.normalizeIp(ip);
    const ban = await this.banRepository.findOne({ where: { ip: normalizedIp } });
    if (!ban) return { blocked: false, ban: null };

    if (ban.manualPermanentBan) {
      return { blocked: true, ban };
    }

    if (ban.bannedUntil && ban.bannedUntil > new Date()) {
      return { blocked: true, ban };
    }

    return { blocked: false, ban };
  }
}

