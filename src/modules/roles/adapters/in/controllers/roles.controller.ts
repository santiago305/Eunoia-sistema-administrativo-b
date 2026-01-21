import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateRoleDto } from 'src/modules/roles/adapters/in/dtos/create-role.dto';
import { UpdateRoleDto } from 'src/modules/roles/adapters/in/dtos/update-role.dto';
import { Roles } from 'src/shared/utilidades/decorators/roles.decorator';
import { RoleType } from 'src/shared/constantes/constants';
import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';

// UseCases
import { CreateRoleUseCase } from 'src/modules/roles/application/use-cases/create-role.usecase';
import { ListRolesUseCase } from 'src/modules/roles/application/use-cases/list-roles.usecase';
import { ListActiveRolesUseCase } from 'src/modules/roles/application/use-cases/list-active-role.usecase';
import { GetRoleByIdUseCase } from 'src/modules/roles/application/use-cases/get-role-by-id.usecase';
import { UpdateRoleUseCase } from 'src/modules/roles/application/use-cases/update-role.usecase';
import { DeleteRoleUseCase } from 'src/modules/roles/application/use-cases/delete-role.usecase';
import { RestoreRoleUseCase } from 'src/modules/roles/application/use-cases/restore-role.usecase';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN, RoleType.MODERATOR, RoleType.ADVISER)
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly listActiveRolesUseCase: ListActiveRolesUseCase,
    private readonly getRoleByIdUseCase: GetRoleByIdUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly restoreRoleUseCase: RestoreRoleUseCase,
  ) {}

  @Post('/create')
  create(@Body() dto: CreateRoleDto) {
    return this.createRoleUseCase.execute(dto, RoleType.ADMIN);
  }

  @Get('')
  findAll() {
    return this.listRolesUseCase.execute();
  }

  @Get('/actives')
  findActives() {
    return this.listActiveRolesUseCase.execute();
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.getRoleByIdUseCase.execute(id);
  }

  @Patch('/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.updateRoleUseCase.execute(id, dto);
  }

  @Delete('/:id')
  remove(@Param('id') id: string) {
    return this.deleteRoleUseCase.execute(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.restoreRoleUseCase.execute(id);
  }
}




















// import { Controller, Post, Get, Body, Param, Patch, Delete } from '@nestjs/common';
// import { RolesService } from 'src/modules/roles/use-cases/roles.service';
// import { CreateRoleDto } from 'src/modules/roles/adapters/in/dtos/create-role.dto';
// import { UpdateRoleDto } from 'src/modules/roles/adapters/in/dtos/update-role.dto';
// import { Roles } from 'src/shared/utilidades/decorators/roles.decorator';
// import { RoleType } from 'src/shared/constantes/constants';
// import { UseGuards } from '@nestjs/common';
// import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
// import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';

// /**
//  * Controlador encargado de gestionar las rutas relacionadas con los roles de usuario.
//  *
//  * Todos los endpoints de este controlador estAn protegidos por el `RolesGuard`,
//  * lo que significa que solo los usuarios autenticados con rol `ADMIN` pueden acceder.
//  *
//  * Ruta base: `/roles`
//  *
//  * @protected Solo accesible por usuarios con el rol `ADMIN`.
//  */
// @Controller('roles')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(RoleType.ADMIN)
// export class RolesController {
//   constructor(private readonly rolesService: RolesService) {}

//   /**
//    * Crea un nuevo rol.
//    *
//    * @param dto - Datos para crear el rol.
//    * @returns El rol creado.
//    * @route POST /roles
//    */
//   @Post()
//   create(@Body() dto: CreateRoleDto) {
//     return this.rolesService.create(dto);
//   }

//   /**
//    * Obtiene todos los roles registrados.
//    *
//    * @returns Lista de todos los roles.
//    * @route GET /roles
//    */
//   @Get()
//   findAll() {
//     return this.rolesService.findAll();
//   }

//   /**
//    * Obtiene todos los roles activos (no eliminados).
//    *
//    * @returns Lista de roles activos.
//    * @route GET /roles/actives
//    */
//   @Get('actives')
//   findActives() {
//     return this.rolesService.findActives();
//   }

//   /**
//    * Obtiene un rol por su ID.
//    *
//    * @param id - ID del rol.
//    * @returns El rol correspondiente.
//    * @route GET /roles/:id
//    */
//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.rolesService.findOne(id);
//   }

//   /**
//    * Actualiza un rol por su ID.
//    *
//    * @param id - ID del rol.
//    * @param dto - Datos actualizados del rol.
//    * @returns El rol actualizado.
//    * @route PATCH /roles/:id
//    */
//   @Patch(':id')
//   update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
//     return this.rolesService.update(id, dto);
//   }

//   /**
//    * Marca un rol como eliminado (soft delete).
//    *
//    * @param id - ID del rol.
//    * @returns El rol con estado `deleted` en true.
//    * @route DELETE /roles/:id
//    */
//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.rolesService.remove(id);
//   }

//   /**
//    * Restaura un rol previamente eliminado.
//    *
//    * @param id - ID del rol.
//    * @returns El rol restaurado.
//    * @route PATCH /roles/:id/restore
//    */
//   @Patch(':id/restore')
//   restore(@Param('id') id: string) {
//     return this.rolesService.restore(id);
//   }
// }

