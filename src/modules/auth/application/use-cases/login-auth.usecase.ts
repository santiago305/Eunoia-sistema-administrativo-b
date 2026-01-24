import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginAuthDto } from 'src/modules/auth/adapters/in/dtos';
import {
  TOKEN_READ_REPOSITORY,
  TokenReadRepository,
} from 'src/modules/auth/application/ports/token-read.repository';
import {
  PASSWORD_HASHER_READ_REPOSITORY,
  PasswordHasherReadRepository,
} from 'src/modules/auth/application/ports/password-hasher-read.repository';
import { GetUserWithPasswordByEmailUseCase } from 'src/modules/users/application/use-cases/get-user-with-password-by-email.usecase';
import { RoleType } from 'src/shared/constantes/constants';

@Injectable()
export class LoginAuthUseCase {
  constructor(
    private readonly getUserWithPasswordByEmailUseCase: GetUserWithPasswordByEmailUseCase,
    @Inject(TOKEN_READ_REPOSITORY)
    private readonly tokenReadRepository: TokenReadRepository,
    @Inject(PASSWORD_HASHER_READ_REPOSITORY)
    private readonly passwordHasher: PasswordHasherReadRepository,
  ) {}

  private async validateUser(email: string, password: string) {
    const user = await this.getUserWithPasswordByEmailUseCase.execute(email);

    if (!user) throw new UnauthorizedException('Credenciales invalidas');

    const isPasswordValid = await this.passwordHasher.verify(user.password, password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales invalidas');

    return user;
  }

  async execute(dto: LoginAuthDto): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.validateUser(dto.email, dto.password);

    const payload = {
      sub: user.id,
      role: user.role?.description || RoleType.ADVISER,
    };

    const access_token = this.tokenReadRepository.signAccessToken(payload);
    const refresh_token = this.tokenReadRepository.signRefreshToken(payload);

    return { access_token, refresh_token };
  }
}
