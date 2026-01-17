import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from '../adapters/in/controllers/roles.controller';
import { RolesService } from '../use-cases/roles.service';
import { Role } from './orm-entities/role.entity';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';

/**
 * MAdulo que gestiona todo lo relacionado con los roles de usuario.
 *
 * Este mAdulo incluye:
 * - La entidad `Role`.
 * - El controlador `RolesController` que expone endpoints HTTP.
 * - El servicio `RolesService` que contiene la lAgica de negocio.
 *
 * @remarks
 * Usa `TypeOrmModule.forFeature` para registrar la entidad `Role` en el contexto de este mAdulo.
 * Exporta el servicio para que pueda ser reutilizado en otros mAdulos (como `UsersModule`).
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [RolesModule],
 * })
 * export class UsersModule {}
 * ```
 */
@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([Role])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService], // Permite usar el servicio en otros mAdulos
})
export class RolesModule {}

