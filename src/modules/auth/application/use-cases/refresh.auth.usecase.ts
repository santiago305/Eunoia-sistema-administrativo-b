import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  TOKEN_READ_REPOSITORY,
  TokenReadRepository,
  AuthTokenPayload,
} from 'src/modules/auth/application/ports/token-read.repository';
import { SESSION_READ_REPOSITORY, SessionReadRepository } from 'src/modules/sessions/application/ports/session-read.repository';
import { SESSION_REPOSITORY, SessionRepository } from 'src/modules/sessions/application/ports/session.repository';
import { SESSION_TOKEN_HASHER, SessionTokenHasherRepository } from 'src/modules/sessions/application/ports/session-token-hasher.repository';
import { envs } from 'src/infrastructure/config/envs';
import ms from 'ms';

@Injectable()
export class RefreshAuthUseCase {
  constructor(
    @Inject(TOKEN_READ_REPOSITORY)
    private readonly tokenReadRepository: TokenReadRepository,
    @Inject(SESSION_READ_REPOSITORY)
    private readonly sessionReadRepository: SessionReadRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    @Inject(SESSION_TOKEN_HASHER)
    private readonly tokenHasher: SessionTokenHasherRepository,
  ) {}

  async execute(params: {
    user: AuthTokenPayload;
    refreshToken: string;
  }) {
    if (!params.user?.sub || !params.user?.sessionId) {
      throw new UnauthorizedException('Token invalido');
    }

    const session = await this.sessionReadRepository.findByIdAndUserId(
      params.user.sessionId,
      params.user.sub,
    );

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesion invalida o expirada');
    }

    const tokenMatches = await this.tokenHasher.verify(
      session.refreshTokenHash,
      params.refreshToken,
    );

    if (!tokenMatches) {
      throw new UnauthorizedException('Token de refresco invalido');
    }

    const payload = {
      sub: params.user.sub,
      role: params.user.role,
      sessionId: params.user.sessionId,
    };

    const access_token = this.tokenReadRepository.signAccessToken(payload);
    const refresh_token = this.tokenReadRepository.signRefreshToken(payload);

    const newHash = await this.tokenHasher.hash(refresh_token);
    const expiresAt = this.calculateExpiresAt();
    await this.sessionRepository.updateUsage(params.user.sessionId, {
      refreshTokenHash: newHash,
      lastUsedAt: new Date(),
      expiresAt,
    });

    return { access_token, refresh_token };
  }

  private calculateExpiresAt() {
    const ttl = ms(envs.jwt.refreshExpiresIn as string);
    const ttlMs = typeof ttl === 'number' && ttl > 0 ? ttl : 7 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ttlMs);
  }
}
