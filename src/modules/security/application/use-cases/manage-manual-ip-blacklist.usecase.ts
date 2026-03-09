import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';

@Injectable()
export class ManageManualIpBlacklistUseCase {
  constructor(
    @InjectRepository(IpBan)
    private readonly banRepository: Repository<IpBan>,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
  ) {}

  async setManualPermanentBan(params: {
    ip: string;
    notes?: string;
    createdBy?: string;
    reviewedBy?: string;
  }): Promise<IpBan> {
    const ip = this.resolveClientIpUseCase.normalizeIp(params.ip);
    let ban = await this.banRepository.findOne({ where: { ip } });
    if (!ban) {
      ban = this.banRepository.create({ ip });
    }

    ban.manualPermanentBan = true;
    ban.bannedUntil = null;
    ban.notes = params.notes ?? ban.notes ?? null;
    ban.createdBy = params.createdBy ?? ban.createdBy ?? null;
    ban.reviewedBy = params.reviewedBy ?? ban.reviewedBy ?? null;
    ban.lastReason = 'manual_permanent_ban';

    return this.banRepository.save(ban);
  }

  async removeManualPermanentBan(ip: string, reviewedBy?: string): Promise<IpBan | null> {
    const normalizedIp = this.resolveClientIpUseCase.normalizeIp(ip);
    const ban = await this.banRepository.findOne({ where: { ip: normalizedIp } });
    if (!ban) return null;

    ban.manualPermanentBan = false;
    ban.banLevel = 0;
    ban.bannedUntil = null;
    ban.reviewedBy = reviewedBy ?? ban.reviewedBy ?? null;
    ban.lastReason = 'manual_unban';

    return this.banRepository.save(ban);
  }
}

