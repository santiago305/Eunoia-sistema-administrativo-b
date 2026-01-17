import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { RolesModule } from 'src/roles/roles.module';

/**
 * MAdulo encargado de la gestiAn de usuarios.
 * Incluye el controlador, servicio y entidad User.
 */
@Module({
  imports: [
    RolesModule,
    TypeOrmModule.forFeature([User, Role])], // Importa la entidad User para operaciones con TypeORM
  controllers: [UsersController], // Controlador REST para endpoints relacionados con usuarios
  providers: [UsersService], // Servicio con la lAgica de negocio para usuarios
  exports: [UsersService], // Exporta el servicio para que pueda ser usado en otros mAdulos
})
export class UsersModule {}

