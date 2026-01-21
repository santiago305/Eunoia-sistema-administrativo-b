import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserUseCase } from 'src/modules/users/application/use-cases/create-user.usecase';
import { GetUserWithPasswordByEmailUseCase } from 'src/modules/users/application/use-cases/get-user-with-password-by-email.usecase';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import {
  TOKEN_READ_REPOSITORY,
  TokenReadRepository,
} from 'src/modules/auth/application/ports/token-read.repository';
import { RoleType } from 'src/shared/constantes/constants';

@Injectable()
export class RegisterAuthUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserWithPasswordByEmailUseCase: GetUserWithPasswordByEmailUseCase,
    @Inject(TOKEN_READ_REPOSITORY)
    private readonly tokenReadRepository: TokenReadRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<{ access_token: string; refresh_token: string }> {
    await this.createUserUseCase.execute(dto, RoleType.ADVISER);

    const user = await this.getUserWithPasswordByEmailUseCase.execute(dto.email);
    if (!user) throw new UnauthorizedException('Error al registrar usuario');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.description || RoleType.ADVISER,
    };

    const access_token = this.tokenReadRepository.signAccessToken(payload);
    const refresh_token = this.tokenReadRepository.signRefreshToken(payload);

    return { access_token, refresh_token };
  }
}
