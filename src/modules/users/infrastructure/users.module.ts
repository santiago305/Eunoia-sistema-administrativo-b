import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from '../use-cases/users.service';
import { UsersController } from '../adapters/in/controllers/users.controller';
import { User } from './orm-entities/user.entity';
import { Role } from 'src/modules/roles/infrastructure/orm-entities/role.entity';
import { RolesModule } from 'src/modules/roles/infrastructure/roles.module';
import { USER_REPOSITORY } from '../domain';
import { TypeormUserRepository } from './repositories/typeorm-user.repository';

/**
 * MAdulo encargado de la gestiAn de usuarios.
 * Incluye el controlador, servicio y entidad User.
 */
@Module({
  imports: [
    RolesModule,
    TypeOrmModule.forFeature([User, Role]),
  ], // Importa la entidad User para operaciones con TypeORM
  controllers: [UsersController], // Controlador REST para endpoints relacionados con usuarios
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: TypeormUserRepository,
    },
  ], // Servicio con la lИgica de negocio para usuarios
  exports: [UsersService, USER_REPOSITORY], // Exporta el servicio para que pueda ser usado en otros modulos
})
export class UsersModule {}
