import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/infrastructure/orm-entities/user.entity';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { UpdateUserDto } from 'src/modules/users/adapters/in/dtos/update-user.dto';
import * as argon2 from 'argon2';
import { RoleType } from 'src/shared/constantes/constants';
import { errorResponse, successResponse } from 'src/shared/response-standard/response';
import { RolesService } from 'src/modules/roles/use-cases/roles.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly rolesService: RolesService,
  ) {}

  private async getUsers(
    whereClause?: string,
    page: number = 1,
    filters?: { role?: string },
    sortBy: string = 'user.createdAt',
    order: 'ASC' | 'DESC' = 'DESC'
  ) {
    const pageSize = 20;
    const offset = (page - 1) * pageSize;
  
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'role.description As rol',
        'user.deleted',
        'user.createdAt',
      ])
      .skip(offset)
      .take(pageSize);
  
    // Aplica condiciones en orden seguro
    if (whereClause) {
      query.where(whereClause);
    } else {
      query.where('1=1'); // para permitir encadenar andWhere incluso si no hay filtro base
    }
  
    if (filters?.role) {
      query.andWhere('rol = :role', { role: filters.role });
    }
  
    query.orderBy(sortBy, order);
  
    return query.getRawMany();
  }
  
  async findAll(params: {
    page?: number,
    filters?: { role?: string },
    sortBy?: string,
    order?: 'ASC' | 'DESC'
  }) {
    return this.getUsers(undefined, params.page, params.filters, params.sortBy, params.order);
  }

  async findActives(params: {
    page?: number,
    filters?: { role?: string },
    sortBy?: string,
    order?: 'ASC' | 'DESC'
  }){
    return await this.getUsers('role.deleted = false', params.page, params.filters, params.sortBy, params.order)
  }

  async findOne(id: string) {
    const user = await this.userRepository
    .createQueryBuilder('user')
    .leftJoin('user.role', 'role')
    .select([
      'user.id',
      'user.name',
      'user.email',
      'role.description AS rol',
      'user.deleted',
    ])
    .where('user.deleted = :deleted', { deleted: false })
    .andWhere('user.id = :id', { id })
    .getRawOne();
    
    if(!user) return errorResponse('No hemos podido encotrar el usuario')

    return successResponse('usuarios encontrado', user)
  }
  private async checkUserStatus(
    id: string, 
    deleted: boolean = false, 
    errorMsg: string, 
    ){
    const query = this.userRepository
    .createQueryBuilder('user')
    .where('user.deleted = :deleted', { deleted })
    .andWhere('user.id = :id', { id: id })

    const exists = await query.getExists();

    if (!exists) throw new UnauthorizedException(errorMsg)

    return true
  }
  async isUserActive(id: string) {
    return await this.checkUserStatus(id, false, 'El usuario ingresado no existe')
  }
  async isUserDeleted(id: string) {
    return await this.checkUserStatus(id, true, 'Este usuario todavia no ha sido eliminado')
  }

  async isUserEmail(email: string) {
    const exists = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .getExists();
  
    if (exists) {
      throw new UnauthorizedException('Este email ya estA registrado');
    }
  
    return true;
  }

  async findByEmail(email: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'role.description As rol'
      ])
      .where('user.email = :email', { email })
      .andWhere('user.deleted = false')
      .getRawOne();
  
    if (!user) return errorResponse('No hemos encontrado el usuario');

    return successResponse('Usuario encontrado', user);
  }
  async findOwnUser(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    // Eliminamos la contraseña por seguridad
    delete (user as any).password;

    return successResponse('Usuario encontrado', user);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isMatch = await argon2.verify(user.password, currentPassword);
    if (!isMatch) throw new UnauthorizedException('Contraseña actual incorrecta');

    user.password = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.userRepository.save(user);

    return successResponse('Contraseña actualizada correctamente');
  }

  async create(dto: CreateUserDto, requesterRole: string) {

    await this.isUserEmail(dto.email);
    
    if (dto.roleId) {
      await this.rolesService.isRoleActive(dto.roleId);
    }

    const hashedPassword = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const isAdmin = requesterRole === RoleType.ADMIN;

    const targetRoleType = isAdmin ? dto.roleId ?? RoleType.USER : RoleType.USER;
  
    const roleResult = await this.rolesService.findOneDescription(targetRoleType);

    const roleId = roleResult.data.id || RoleType.USER ;
  
    try {
      await this.userRepository
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: { id: roleId }
        })
        .execute();
    
      return successResponse('Usuario creado correctamente') 
    } catch (error) {
      console.error('[UsersService][create] error al crear un usuario: ',error);
      throw new UnauthorizedException('Se ha producido un error al crear al usuario')  
    }
  }
  
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id)

    const updateData: Partial<User> = {};
    if (dto.email) {
      await this.isUserEmail(dto.email);
      updateData.email = dto.email;
    }
    if (dto.roleId) {
      await this.rolesService.isRoleActive(dto.roleId);
    }

    if (dto.name) updateData.name = dto.name;
    if (dto.password) {
      updateData.password = await argon2.hash(dto.password, {
        type: argon2.argon2id,
      });
    }

    try {

      await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set(updateData)
      .where('id = :id',{id})
      .execute();

      const updateUser = await this.findOne(id)

      return successResponse('Modificacion terminada', updateUser)
    } catch (error) {
      console.error('[UserService][update] error al editar el usuario: ', error);
      throw new UnauthorizedException('No pudimos modificar el usuario')
      
    }
  }

  private async toggleDelete(
    id: string, 
    deleted: boolean, 
    successMsg: string, 
    errorMsg: string) {
      try {
        await this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({ deleted })
          .where('id = :id', { id })
          .execute();
    
        return successResponse(successMsg);
      } catch (error) {
        console.error('[UserService][toggleDelete] error de la accion', error);
        throw new UnauthorizedException(errorMsg);
      }
    }
  async remove(id: string) {
    await this.isUserActive(id);
    return this.toggleDelete(id, true, 'El usuario ha sido eliminado','no se pudo eliminar al usuario')
  }

  async restore(id: string ) {
    await this.isUserDeleted(id)
    return this.toggleDelete(id, false, 'El usuario ha sido restaurado','No se pudo restaurar al usuario')
  }

  async findWithPasswordByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    role: { description: string };
  } | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'user.password',
        'role.description',
      ])
      .where('user.email = :email', { email })
      .andWhere('user.deleted = false')
      .getOne();

    return user || null;
  }


  async updateAvatar(id: string, filePath: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) throw new UnauthorizedException('Usuario no encontrado');

      user.avatarUrl = filePath;
      await this.userRepository.save(user);

      return successResponse('Avatar actualizado correctamente', user);
    } catch (error) {
      console.error('[UserService][updateAvatar] Error al subir avatar:', error);
      throw new UnauthorizedException('No se pudo actualizar el avatar');
    }
  }
}

