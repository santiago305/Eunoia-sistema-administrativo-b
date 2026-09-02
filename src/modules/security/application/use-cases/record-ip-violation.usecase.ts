import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';

@Injectable()
export class RecordIpViolationUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
  ) {}

  async execute(params: {
    ip: string;
    reason: string;
    path?: string;
    method?: string;
    userAgent?: string;
    requestId?: string;
    actor?: string;
    countedForBan?: boolean;
    banLevelAfter?: number;
    bannedUntilAfter?: Date | null;
  }): Promise<void> {
    const ip = this.resolveClientIpUseCase.normalizeIp(params.ip);

    await this.violationRepository.save(
      this.violationRepository.create({
        ip,
        reason: params.reason,
        path: params.path ?? null,
        method: params.method ?? null,
        userAgent: params.userAgent ?? null,
        requestId: params.requestId ?? null,
        actor: params.actor ?? null,
        countedForBan: params.countedForBan ?? false,
        banLevelAfter: params.banLevelAfter ?? null,
        bannedUntilAfter: params.bannedUntilAfter ?? null,
      }),
    );
  }
}
