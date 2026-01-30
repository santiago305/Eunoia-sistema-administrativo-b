import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  TOKEN_READ_REPOSITORY,
  TokenReadRepository,
  AuthTokenPayload,
} from 'src/modules/auth/application/ports/token-read.repository';
import {
  PASSWORD_HASHER_READ_REPOSITORY,
  PasswordHasherReadRepository,
} from 'src/modules/auth/application/ports/password-hasher-read.repository';
import {
  SESSION_REPOSITORY,
  SessionRepository,
} from 'src/modules/sessions/application/ports/session.repository';

@Injectable()
export class RefreshAuthUseCase {
  constructor(
    @Inject(TOKEN_READ_REPOSITORY)
    private readonly tokenReadRepository: TokenReadRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    @Inject(PASSWORD_HASHER_READ_REPOSITORY)
    private readonly passwordHasher: PasswordHasherReadRepository,
  ) {}

  async execute(params: {
    user: AuthTokenPayload;
    deviceId: string;
    refreshToken: string;
  }) {
    if (!params.user?.sub) {
      throw new UnauthorizedException('Token invalido');
    }

    const session = await this.sessionRepository.findActiveByUserAndDevice(
      params.user.sub,
      params.deviceId,
    );
    if (!session) {
      throw new UnauthorizedException('Sesion no encontrada');
    }

    const valid = await this.passwordHasher.verify(
      session.refreshTokenHash,
      params.refreshToken,
    );
    if (!valid) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    // (Opcional) actualizar lastSeen si quieres hacerlo aquí:
    await this.sessionRepository.updateLastSeen(session.id, new Date());

    const payload = {
      sub: params.user.sub,
      role: params.user.role,
    };

    const access_token = this.tokenReadRepository.signAccessToken(payload);

    return { access_token };
  }
}
