import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  TOKEN_READ_REPOSITORY,
  TokenReadRepository,
  AuthTokenPayload,
} from 'src/modules/auth/application/ports/token-read.repository';

@Injectable()
export class RefreshAuthUseCase {
  constructor(
    @Inject(TOKEN_READ_REPOSITORY)
    private readonly tokenReadRepository: TokenReadRepository,
  ) {}

  async execute(params: {
    user: AuthTokenPayload;
  }) {
    if (!params.user?.sub) {
      throw new UnauthorizedException('Token invalido');
    }

    const payload = {
      sub: params.user.sub,
      role: params.user.role,
    };

    const access_token = this.tokenReadRepository.signAccessToken(payload);
    const refresh_token = this.tokenReadRepository.signRefreshToken(payload);

    return { access_token, refresh_token };
  }
}
