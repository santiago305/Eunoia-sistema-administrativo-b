import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from '../adapters/in/controllers/roles.controller';
import { Role } from '../adapters/out/persistence/typeorm/entities/role.entity';
import { rolesModuleProviders } from '../composition/container';
import { ROLE_REPOSITORY } from '../application/ports/role.repository';
import { ROLE_READ_REPOSITORY } from '../application/ports/role-read.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  controllers: [RolesController],
  providers: [...rolesModuleProviders],
  exports: [ROLE_REPOSITORY, ROLE_READ_REPOSITORY],
})
export class RolesModule {}
