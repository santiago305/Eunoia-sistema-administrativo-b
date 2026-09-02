import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { envs } from 'src/infrastructure/config/envs';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';
import { IpViolation } from '../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { SecurityReasonCatalog } from '../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { SecurityController } from '../adapters/in/controllers/security.controller';
import { securityModuleProviders } from '../composition/container';
import { RedisThrottlerStorage } from './providers/redis-throttler.storage';

@Module({
  imports: [
    AccessControlModule,
    JwtModule.register({
      secret: envs.jwt.secret,
      signOptions: {
        expiresIn: envs.jwt.expiresIn,
        issuer: envs.jwt.issuer,
      },
    }),
    TypeOrmModule.forFeature([IpViolation, IpBan, SecurityReasonCatalog]),
  ],
  controllers: [SecurityController],
  providers: [...securityModuleProviders, RedisThrottlerStorage],
  exports: [...securityModuleProviders, RedisThrottlerStorage],
})
export class SecurityModule {}
