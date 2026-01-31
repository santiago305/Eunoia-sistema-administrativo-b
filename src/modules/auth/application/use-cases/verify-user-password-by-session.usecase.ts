import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  PASSWORD_HASHER_READ_REPOSITORY,
  PasswordHasherReadRepository,
} from 'src/modules/auth/application/ports/password-hasher-read.repository';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';

@Injectable()
export class VerifyUserPasswordBySessionUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER_READ_REPOSITORY)
    private readonly passwordHasher: PasswordHasherReadRepository,
  ) {}

  async execute(params: {
    userId: string;
    password: string;
  }): Promise<{ pass: boolean }> {
    const userId = params?.userId?.trim();
    const password = params?.password ?? '';

    if (!userId) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!password.trim()) {
      return { pass: false };
    }

    const pass = await this.passwordHasher.verify(user.password.value, password);
    return { pass };
  }
}
