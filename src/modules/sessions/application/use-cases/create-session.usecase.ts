import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { envs } from 'src/infrastructure/config/envs';
import ms from 'ms';
import { SessionFactory } from '../../domain/factories/session.factory';
import { SESSION_REPOSITORY, SessionRepository } from '../ports/session.repository';
import { SESSION_TOKEN_HASHER, SessionTokenHasherRepository } from '../ports/session-token-hasher.repository';

@Injectable()
export class CreateSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    @Inject(SESSION_TOKEN_HASHER)
    private readonly tokenHasher: SessionTokenHasherRepository,
  ) {}

  async execute(params: {
    id: string;
    userId: string;
    refreshToken: string;
    ip?: string | null;
    userAgent?: string | null;
    deviceName?: string | null;
  }) {
    const userId = params.userId?.trim();
    const refreshToken = params.refreshToken?.trim();

    if (!userId || !refreshToken) {
      throw new BadRequestException('Datos de sesion incompletos');
    }

    const hash = await this.tokenHasher.hash(refreshToken);
    const expiresAt = this.calculateExpiresAt();

    const session = SessionFactory.create({
      id: params.id,
      userId,
      refreshTokenHash: hash,
      expiresAt,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      deviceName: params.deviceName ?? null,
    });

    return this.sessionRepository.save(session);
  }

  private calculateExpiresAt() {
    const ttl = ms(envs.jwt.refreshExpiresIn as string);
    const ttlMs = typeof ttl === 'number' && ttl > 0 ? ttl : 7 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ttlMs);
  }
}
