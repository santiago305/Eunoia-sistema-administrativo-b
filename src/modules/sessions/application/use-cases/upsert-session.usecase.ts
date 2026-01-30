import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from 'src/modules/sessions/application/ports/session.repository';
import { SessionFactory } from 'src/modules/sessions/domain/factories/session.factory';
import { UserId } from 'src/modules/sessions/domain/values-objects/user.vo';

@Injectable()
export class UpsertSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(params: {
    userId: string;
    deviceId: string;
    deviceName?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
    refreshTokenHash: string;
    expiresAt: Date;
  }) {
    new UserId(params.userId);

    const deviceId = params.deviceId?.trim();
    if (!deviceId) throw new UnauthorizedException('DeviceId invalido');

    const refreshTokenHash = params.refreshTokenHash?.trim();
    if (!refreshTokenHash) throw new UnauthorizedException('Refresh token invalido');

    const existing = await this.sessionRepository.findActiveByUserAndDevice(
      params.userId,
      deviceId,
    );

    // ✅ si existe: actualizar hash/expires y lastSeen
    if (existing) {
      await this.sessionRepository.updateRefreshTokenHash(existing.id, refreshTokenHash, params.expiresAt);
      await this.sessionRepository.updateLastSeen(existing.id, new Date());
      return existing;
    }

    // ✅ si no existe: crear nueva
    const session = SessionFactory.createNew({
      userId: params.userId,
      deviceId,
      deviceName: params.deviceName ?? null,
      userAgent: params.userAgent ?? null,
      ipAddress: params.ipAddress ?? null,
      refreshTokenHash,
      expiresAt: params.expiresAt,
    });

    return this.sessionRepository.save(session);
  }
}
