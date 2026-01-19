import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesController } from '../adapters/in/controllers/roles.controller';

import { Role } from '../adapters/out/persistence/typeorm/entities/role.entity';

import { TypeormRoleRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-role.repository';
import { TypeormRoleReadRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-role-read.repository';

import { CreateRoleUseCase } from '../application/use-cases/create-role.usecase';
import { ListRolesUseCase } from '../application/use-cases/list-roles.usecase';
import { ListActiveRolesUseCase } from '../application/use-cases/list-active-role.usecase';
import { GetRoleByIdUseCase } from '../application/use-cases/get-role-by-id.usecase';
import { UpdateRoleUseCase } from '../application/use-cases/update-role.usecase';
import { DeleteRoleUseCase } from '../application/use-cases/delete-role.usecase';
import { RestoreRoleUseCase } from '../application/use-cases/restore-role.usecase';


import { ROLE_REPOSITORY } from '../application/ports/role.repository';
import { ROLE_READ_REPOSITORY } from '../application/ports/role-read.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  controllers: [RolesController],
  providers: [
    CreateRoleUseCase,
    ListRolesUseCase,
    ListActiveRolesUseCase,
    GetRoleByIdUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    RestoreRoleUseCase,
    {
      provide: ROLE_REPOSITORY,
      useClass: TypeormRoleRepository,
    },
    {
      provide: ROLE_READ_REPOSITORY,
      useClass: TypeormRoleReadRepository,
    },
  ],
  exports: [
      ROLE_REPOSITORY,
      ROLE_READ_REPOSITORY,
  ],
})
export class RolesModule {}
