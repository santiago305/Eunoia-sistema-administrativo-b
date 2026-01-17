import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateRoleDto } from 'src/modules/roles/adapters/in/dtos/create-role.dto';
import { UpdateRoleDto } from 'src/modules/roles/adapters/in/dtos/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from 'src/modules/roles/infrastructure/orm-entities/role.entity';
import { successResponse } from 'src/shared/response-standard/response';
import { isTypeResponse } from 'src/shared/response-standard/guard';

/**
 * Servicio encargado de la gestion de roles en el sistema.
 *
 * Incluye operaciones CRUD, ademAs de mAtodos para restaurar o marcar un rol como eliminado (soft delete).
 */
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}


  async create(dto: CreateRoleDto) {
    await this.isRoleExisting(dto.description)

    try {
     await this.roleRepository
    .createQueryBuilder()
    .insert()
    .into(Role)
    .values(dto)
    .returning(['id', 'description', 'deleted'])
    .execute();

    return successResponse('Rol creado exitosamente')
    
    } catch (error) {
       console.error('[RolesService][create] error al crear el rol: ', error)
       throw new UnauthorizedException('No hemos podido crear el rol')
    }
  }


  private async getRoles(whereClause?: string) {
    const query = this.roleRepository
      .createQueryBuilder('role')
      .select([
        'role.id',
        'role.description',
        'role.deleted',
      ]);
    
    if (whereClause) query.where(whereClause);
  
    return query.getRawMany();
  }
  async findAll() {
      return await this.getRoles()
  }
    
  async findActives() {
    return await this.getRoles('role.deleted = false')
  }


  async findOne(id: string) {

    const role = await this.roleRepository
    .createQueryBuilder('role')
    .select([
      'role.id',
      'role.description',
      'role.deleted',
    ])
    .where('role.deleted = :deleted', { deleted: false })
    .andWhere('role.id = :id', { id })
    .getOne();
    
    if (!role)throw new UnauthorizedException('rol no encontrado');

    return successResponse('Hemos encontrado el rol', role)
  }

  async findOneDescription(description: string) {
    const role = await this.roleRepository
      .createQueryBuilder('role')
      .select(['role.id'])
      .where('role.description = :description', { description })
      .getOne();
  
    if (!role) throw new UnauthorizedException('El rol no existe');
  
    return successResponse('El rol ha sido encontrado', role);
  }

  private async checkRoleStatus(id: string, deleted: boolean, errorMsg: string){
    const role = await this.roleRepository
    .createQueryBuilder('role')
    .where('role.deleted = :deleted', { deleted })
    .andWhere('role.id = :id', { id })
    .getExists();

    if (!role) throw new UnauthorizedException(errorMsg)

    return true
  }
  async isRoleActive(id: string) {
    return await this.checkRoleStatus(id, false, 'Ese rol no existe')
  }

  async isRoleDeleted(id: string) {
    return await this.checkRoleStatus(id, true, 'Ese rol todavia no ha sido eliminado')
  }

  async isRoleExisting (description: string){
    const isRoleExisting = await this.roleRepository
    .createQueryBuilder('role')
    .where('role.description = :description', { description })
    .andWhere('role.deleted = false')
    .getExists()

    if (isRoleExisting) {
      throw new UnauthorizedException('Ese rol ya existe');
    }

    return true;
  }
  /**
   * Actualiza un rol existente por ID.
   *
   * @param id - ID del rol a actualizar.
   * @param dto - Datos actualizados del rol.
   * @returns El rol actualizado.
   */
  async update(id: string, dto: UpdateRoleDto) {
    await this.isRoleActive(id);

    try {
      await this.roleRepository
        .createQueryBuilder()
        .update(Role)
        .set({ ...dto })
        .where('id = :id', { id })
        .execute();

        const updatedRole = await this.findOne(id);

        return successResponse('Hemos modificado el rol', updatedRole)
        
    } catch (error) {
      console.error('[RolesService][update] error al modificar el rol: ',error)
      throw new UnauthorizedException('Hubo un problemita al modificar el rol')
    }
  
    // Retorna el rol actualizado
  }
  

private async toggleDelete(id: string, deleted: boolean, successMsg: string, errorMsg: string) {
  try {
    await this.roleRepository
      .createQueryBuilder()
      .update(Role)
      .set({ deleted })
      .where('id = :id', { id })
      .execute();

    return successResponse(successMsg);
  } catch (error) {
    console.error('[RolesService][toggleDelete] error de la accion', error);
    
   throw new UnauthorizedException(errorMsg);
  }
}
  
  async remove(id: string) {
    const isActive = await this.isRoleActive(id);
    if ( isTypeResponse(isActive)) return isActive; 
    return this.toggleDelete(id, true, 'El rol ha sido eliminado','no se pudo eliminar el rol')
  }

  /**
   * Restaura un rol previamente eliminado (soft restore).
   *
   * @param id - ID del rol a restaurar.
   * @returns El rol restaurado (estado `deleted` en false).
   */
  async restore(id: string) {
    const isDeleted = await this.isRoleDeleted(id)
    if ( isTypeResponse(isDeleted)) return isDeleted;
    return this.toggleDelete(id, false, 'El rol ha sido restaurado','no se pudo restaurar el rol')
  }
}

