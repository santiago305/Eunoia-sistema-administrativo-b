// auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '../use-cases/auth.service';
import { AuthController } from '../adapters/in/controllers/auth.controller';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';
import { JwtStrategy } from './providers/strategy/jwt.strategy';
import { envs } from 'src/infrastructure/config/envs';
import { JwtRefreshStrategy } from './providers/strategy/jwt-refresh.strategy';

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
    AuthService,
    JwtStrategy,          // Estrategia para validar access tokens
    JwtRefreshStrategy,   // Estrategia para validar refresh tokens
  ],
})
export class AuthModule {}
