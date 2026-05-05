import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../roles/adapters/out/persistence/typeorm/entities/role.entity';
import { RolesModule } from 'src/modules/roles/infrastructure/roles.module';
import { User } from '../adapters/out/persistence/typeorm/entities/user.entity';
import { UsersController } from '../adapters/in/controllers/users.controller';
import { USER_READ_REPOSITORY } from '../application/ports/user-read.repository';
import { USER_REPOSITORY } from '../application/ports/user.repository';
import { GetUserWithPasswordByEmailUseCase } from '../application/use-cases/get-user-with-password-by-email.usecase';
import { usersModuleProviders } from '../composition/container';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';

@Module({
  imports: [RolesModule, AccessControlModule, TypeOrmModule.forFeature([User, Role])],
  controllers: [UsersController],
  providers: [...usersModuleProviders],
  exports: [USER_REPOSITORY, USER_READ_REPOSITORY, GetUserWithPasswordByEmailUseCase],
})
export class UsersModule {}
