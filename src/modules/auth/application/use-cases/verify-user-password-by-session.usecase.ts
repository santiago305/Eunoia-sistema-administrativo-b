import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  PASSWORD_HASHER_READ_REPOSITORY,
  PasswordHasherReadRepository,
} from 'src/modules/auth/application/ports/password-hasher-read.repository';
import {
  SESSION_REPOSITORY,
  SessionRepository,
} from 'src/modules/sessions/application/ports/session.repository';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';

@Injectable()
export class VerifyUserPasswordBySessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER_READ_REPOSITORY)
    private readonly passwordHasher: PasswordHasherReadRepository,
  ) {}

  async execute(params: {
    userId: string;
    deviceId: string;
    password: string;
  }): Promise<{ pass: boolean }> {
    const userId = params?.userId?.trim();
    const deviceId = params?.deviceId?.trim();
    const password = params?.password ?? '';

    if (!userId) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }
    if (!deviceId) {
      throw new UnauthorizedException('device_id faltante (cookie)');
    }

    const session = await this.sessionRepository.findActiveByUserAndDevice(userId, deviceId);
    if (!session) {
      throw new UnauthorizedException('Sesion no encontrada');
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
