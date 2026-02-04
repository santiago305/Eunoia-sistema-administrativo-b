import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginAuthDto } from 'src/modules/auth/adapters/in/dtos';
import { TOKEN_READ_REPOSITORY, TokenReadRepository } from 'src/modules/auth/application/ports/token-read.repository';
import { PASSWORD_HASHER_READ_REPOSITORY, PasswordHasherReadRepository } from 'src/modules/auth/application/ports/password-hasher-read.repository';
import { GetUserWithPasswordByEmailUseCase } from 'src/modules/users/application/use-cases/get-user-with-password-by-email.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { CreateSessionUseCase } from 'src/modules/sessions/application/use-cases/create-session.usecase';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoginAuthUseCase {
  constructor(
    private readonly getUserWithPasswordByEmailUseCase: GetUserWithPasswordByEmailUseCase,
    @Inject(TOKEN_READ_REPOSITORY)
    private readonly tokenReadRepository: TokenReadRepository,
    @Inject(PASSWORD_HASHER_READ_REPOSITORY)
    private readonly passwordHasher: PasswordHasherReadRepository,
    private readonly createSessionUseCase: CreateSessionUseCase,
  ) {}

  private async validateUser(email: string, password: string) {
    const user = await this.getUserWithPasswordByEmailUseCase.execute(email);

    if (!user) throw new UnauthorizedException('Credenciales invalidas');

    const isPasswordValid = await this.passwordHasher.verify(user.password, password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales invalidas');

    return user;
  }

  async execute(params: {
    dto: LoginAuthDto;
    ip?: string | null;
    userAgent?: string | null;
    deviceName?: string | null;
  }): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.validateUser(params.dto.email, params.dto.password);

    const sessionId = uuidv4();

    const payload = {
      sub: user.id,
      role: user.role?.description || RoleType.ADVISER,
    };

    const access_token = this.tokenReadRepository.signAccessToken({
      ...payload,
      sessionId,
    });
    const refresh_token = this.tokenReadRepository.signRefreshToken({
      ...payload,
      sessionId,
    });

    await this.createSessionUseCase.execute({
      id: sessionId,
      userId: user.id,
      refreshToken: refresh_token,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      deviceName: params.deviceName ?? null,
    });

    return { access_token, refresh_token };
  }
}
