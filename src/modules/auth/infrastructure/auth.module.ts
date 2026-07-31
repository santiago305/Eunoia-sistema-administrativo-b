import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SessionsModule } from 'src/modules/sessions/infrastructure/sessions.module';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';
import { envs } from 'src/infrastructure/config/envs';
import { AuthController } from '../adapters/in/controllers/auth.controller';
import { authModuleProviders } from '../composition/container';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { SocketSessionAuthorizerService } from '../application/services/socket-session-authorizer.service';

@Module({
  imports: [
    UsersModule,
    SessionsModule,
    AccessControlModule,
    TypeOrmModule.forFeature([User]),
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
  providers: [...authModuleProviders, SocketSessionAuthorizerService],
  exports: [SocketSessionAuthorizerService],
})
export class AuthModule {}
