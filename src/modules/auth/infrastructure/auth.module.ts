// auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../adapters/in/controllers/auth.controller';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';
import { JwtStrategy } from './providers/strategy/jwt.strategy';
import { envs } from 'src/infrastructure/config/envs';
import { JwtRefreshStrategy } from './providers/strategy/jwt-refresh.strategy';
import { RegisterAuthUseCase } from '../application/use-cases/register-auth.usecase';
import { LoginAuthUseCase } from '../application/use-cases/login-auth.usecase';
import { RefreshAuthUseCase } from '../application/use-cases/refresh.auth.usecase';
import { GetAuthUserUseCase } from '../application/use-cases/get-auth-user.usecase';
import { PASSWORD_HASHER_READ_REPOSITORY } from '../application/ports/password-hasher-read.repository';
import { TOKEN_READ_REPOSITORY } from '../application/ports/token-read.repository';
import { JwtTokenReadRepository } from './providers/jwt-token-read.repository';
import { Argon2PasswordHasherReadRepository } from './providers/argon2-password-hasher-read.repository';
import { SessionsModule } from 'src/modules/sessions/infrastructure/session.module';
import { UpsertSessionUseCase } from 'src/modules/sessions/application/use-cases/upsert-session.usecase';
import { RevokeSessionByDeviceUseCase } from 'src/modules/sessions/application/use-cases/revoke-session-by-device.usecase';
import { VerifyUserPasswordBySessionUseCase } from '../application/use-cases/verify-user-password-by-session.usecase';

/**
 * Modulo de autenticacion.
 *
 * Encapsula toda la logica relacionada con login, generacion de JWT,
 * validacion de usuarios y estrategias de Passport (access y refresh tokens).
 */
@Module({
  imports: [
    // Modulo de usuarios para obtener/verificar usuarios desde el servicio
    UsersModule,
    SessionsModule,

    // Passport para integracion con estrategias JWT
    PassportModule,

    // Modulo JWT configurado con datos del entorno
    JwtModule.register({
      secret: envs.jwt.secret,
      signOptions: {
        expiresIn: envs.jwt.expiresIn,
        issuer: envs.jwt.issuer,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,          // Estrategia para validar access tokens
    JwtRefreshStrategy,   // Estrategia para validar refresh tokens
    RegisterAuthUseCase,
    LoginAuthUseCase,
    RefreshAuthUseCase,
    GetAuthUserUseCase,
    UpsertSessionUseCase,
    RevokeSessionByDeviceUseCase,
    VerifyUserPasswordBySessionUseCase,

    { provide: TOKEN_READ_REPOSITORY, useClass: JwtTokenReadRepository },
    { provide: PASSWORD_HASHER_READ_REPOSITORY, useClass: Argon2PasswordHasherReadRepository }
  ],
})
export class AuthModule {}
