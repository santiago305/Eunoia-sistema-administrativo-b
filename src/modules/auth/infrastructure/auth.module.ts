import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SessionsModule } from 'src/modules/sessions/infrastructure/sessions.module';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';
import { envs } from 'src/infrastructure/config/envs';
import { AuthController } from '../adapters/in/controllers/auth.controller';
import { authModuleProviders } from '../composition/container';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';

@Module({
  imports: [
    UsersModule,
    SessionsModule,
    AccessControlModule,
    PassportModule,
    JwtModule.register({
      secret: envs.jwt.secret,
      signOptions: {
        expiresIn: envs.jwt.expiresIn,
        issuer: envs.jwt.issuer,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [...authModuleProviders],
})
export class AuthModule {}
