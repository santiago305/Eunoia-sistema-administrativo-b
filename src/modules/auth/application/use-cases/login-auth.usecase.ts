import { ForbiddenException, HttpException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginAuthDto } from 'src/modules/auth/adapters/in/dtos';
import { TOKEN_READ_REPOSITORY, TokenReadRepository } from 'src/modules/auth/application/ports/token-read.repository';
import { PASSWORD_HASHER_READ_REPOSITORY, PasswordHasherReadRepository } from 'src/modules/auth/application/ports/password-hasher-read.repository';
import { GetUserWithPasswordByEmailUseCase } from 'src/modules/users/application/use-cases/get-user-with-password-by-email.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { CreateSessionUseCase } from 'src/modules/sessions/application/use-cases/create-session.usecase';
import { v4 as uuidv4 } from 'uuid';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';

@Injectable()
export class LoginAuthUseCase {
  private readonly maxAttempts = 5;
  private readonly lockoutDurationsMs = [
    1 * 60 * 1000,   // 1 min
    5 * 60 * 1000,   // 5 min
    30 * 60 * 1000,  // 30 min
    60 * 60 * 1000,  // 1 h
    24 * 60 * 60 * 1000, // 1 d
  ];

  constructor(
    private readonly getUserWithPasswordByEmailUseCase: GetUserWithPasswordByEmailUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(TOKEN_READ_REPOSITORY)
    private readonly tokenReadRepository: TokenReadRepository,
    @Inject(PASSWORD_HASHER_READ_REPOSITORY)
    private readonly passwordHasher: PasswordHasherReadRepository,
    private readonly createSessionUseCase: CreateSessionUseCase,
  ) {}

  private formatRemaining(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  private throwLocked(lockedUntil: Date) {
    const remainingMs = lockedUntil.getTime() - Date.now();
    const remaining = this.formatRemaining(remainingMs);
    throw new HttpException(
      {
        message: `Cuenta bloqueada. Intenta nuevamente en ${remaining}`,
        details: {
          lockedUntil: lockedUntil.toISOString(),
          retryAfterSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
        },
      },
      423,
    );
  }

  private async validateUser(email: string, password: string) {
    const user = await this.getUserWithPasswordByEmailUseCase.execute(email);

    if (!user) throw new UnauthorizedException('Credenciales invalidas');

    if (user.securityDisabledAt) {
      throw new ForbiddenException('Cuenta desactivada. Contacta a un administrador para reactivacion');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.throwLocked(user.lockedUntil);
    }

    const isPasswordValid = await this.passwordHasher.verify(user.password, password);
    if (!isPasswordValid) {
      const failedAttempts = (user.failedLoginAttempts ?? 0) + 1;
      let lockoutLevel = user.lockoutLevel ?? 0;
      let lockedUntil: Date | null = null;

      if (failedAttempts >= this.maxAttempts) {
        lockoutLevel += 1;

        if (lockoutLevel >= this.lockoutDurationsMs.length + 1) {
          await this.userRepository.updateSecurityById(user.id, {
            failedLoginAttempts: 0,
            lockoutLevel,
            lockedUntil: null,
            securityDisabledAt: new Date(),
          });
          throw new ForbiddenException('Cuenta desactivada. Contacta a un administrador para reactivacion');
        }

        const durationMs = this.lockoutDurationsMs[lockoutLevel - 1];
        lockedUntil = new Date(Date.now() + durationMs);
        await this.userRepository.updateSecurityById(user.id, {
          failedLoginAttempts: 0,
          lockoutLevel,
          lockedUntil,
        });

        this.throwLocked(lockedUntil);
      }

      await this.userRepository.updateSecurityById(user.id, {
        failedLoginAttempts: failedAttempts,
        lockoutLevel,
        lockedUntil: null,
      });

      throw new UnauthorizedException('Credenciales invalidas');
    }

    await this.userRepository.updateSecurityById(user.id, {
      failedLoginAttempts: 0,
      lockoutLevel: 0,
      lockedUntil: null,
      securityDisabledAt: null,
    });

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
