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

  async execute(user: AuthTokenPayload) {
    if (!user?.sub) {
      throw new UnauthorizedException('Token invalido');
    }

    const payload = {
      sub: user.sub,
      role: user.role,
    };

    const access_token = this.tokenReadRepository.signAccessToken(payload);

    return { access_token };
  }
}
