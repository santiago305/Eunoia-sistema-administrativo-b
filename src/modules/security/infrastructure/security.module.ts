import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';
import { IpViolation } from '../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { IpBan } from '../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { SecurityReasonCatalog } from '../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { SecurityController } from '../adapters/in/controllers/security.controller';
import { securityModuleProviders } from '../composition/container';

@Module({
  imports: [AccessControlModule, TypeOrmModule.forFeature([IpViolation, IpBan, SecurityReasonCatalog])],
  controllers: [SecurityController],
  providers: [...securityModuleProviders],
  exports: [...securityModuleProviders],
})
export class SecurityModule {}
