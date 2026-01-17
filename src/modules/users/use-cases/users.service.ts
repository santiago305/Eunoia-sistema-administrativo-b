import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/infrastructure/orm-entities/user.entity';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { UpdateUserDto } from 'src/modules/users/adapters/in/dtos/update-user.dto';
import * as argon2 from 'argon2';
import { RoleType } from 'src/shared/constantes/constants';
import { errorResponse, successResponse } from 'src/shared/response-standard/response';
import { RolesService } from 'src/modules/roles/use-cases/roles.service';
import {
  Email,
  Password,
  RoleId,
  USER_REPOSITORY,
  UserFactory,
  UserRepository,
} from 'src/modules/users/domain';
import {
  USER_READ_REPOSITORY,
  UserReadRepository,
} from 'src/modules/users/ports/user-read.repository';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(USER_REPOSITORY)
    private readonly userDomainRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,

    private readonly rolesService: RolesService,
  ) {}

  async findAll(params: {
    page?: number,
    filters?: { role?: string },
    sortBy?: string,
    order?: 'ASC' | 'DESC'
  }) {
    return this.userReadRepository.listUsers({
      page: params.page,
      filters: params.filters,
      sortBy: params.sortBy,
      order: params.order,
    });
  }

  async findActives(params: {
    page?: number,
    filters?: { role?: string },
    sortBy?: string,
    order?: 'ASC' | 'DESC'
  }){
    return this.userReadRepository.listUsers({
      page: params.page,
      filters: params.filters,
      sortBy: params.sortBy,
      order: params.order,
      whereClause: 'role.deleted = false',
    });
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
    const exists = await this.userDomainRepository.existsByEmail(
      new Email(email)
    );
  
    if (exists) {
      throw new UnauthorizedException('Este email ya estA registrado');
    }
  
    return true;
  }

  async findByEmail(email: string) {
    const user = await this.userReadRepository.findPublicByEmail(email);
    if (!user) return errorResponse('No hemos encontrado el usuario');

    return successResponse('Usuario encontrado', {
      id: user.id,
      email: user.email,
      rol: user.roleDescription,
    });
  }
  async findOwnUser(id: string) {
    const user = await this.userReadRepository.findPublicById(id);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    return successResponse('Usuario encontrado', user);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const domainUser = await this.userDomainRepository.findById(id);
    if (!domainUser) throw new UnauthorizedException('Usuario no encontrado');

    const isMatch = await argon2.verify(
      domainUser.password.value,
      currentPassword
    );
    if (!isMatch) throw new UnauthorizedException('Contrasena actual incorrecta');

    const hashedPassword = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    domainUser.password = new Password(hashedPassword);
    await this.userDomainRepository.save(domainUser);

    return successResponse('Contrasena actualizada correctamente');
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
  
    const domainUser = UserFactory.createNew({
      name: dto.name,
      email: new Email(dto.email),
      password: new Password(hashedPassword),
      roleId: new RoleId(roleId),
      avatarUrl: dto.avatarUrl,
    });

    try {
      await this.userDomainRepository.save(domainUser);
      return successResponse('Usuario creado correctamente') 
    } catch (error) {
      console.error('[UsersService][create] error al crear un usuario: ',error);
      throw new UnauthorizedException('Se ha producido un error al crear al usuario')  
    }
  }
  
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id)

    const existingUser = await this.userDomainRepository.findById(id);
    if (!existingUser) throw new UnauthorizedException('Usuario no encontrado');

    if (dto.email) {
      await this.isUserEmail(dto.email);
      existingUser.email = new Email(dto.email);
    }
    if (dto.roleId) {
      await this.rolesService.isRoleActive(dto.roleId);
      existingUser.roleId = new RoleId(dto.roleId);
    }

    if (dto.name) existingUser.name = dto.name;
    if (dto.password) {
      const hashedPassword = await argon2.hash(dto.password, {
        type: argon2.argon2id,
      });
      existingUser.password = new Password(hashedPassword);
    }
    if (dto.avatarUrl) {
      existingUser.avatarUrl = dto.avatarUrl;
    }

    try {

      await this.userDomainRepository.save(existingUser);

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
    const user = await this.userReadRepository.findWithPasswordByEmail(email);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      role: { description: user.roleDescription },
    };
  }


  async updateAvatar(id: string, filePath: string) {
    try {
      const domainUser = await this.userDomainRepository.findById(id);
      if (!domainUser) throw new UnauthorizedException('Usuario no encontrado');

      domainUser.avatarUrl = filePath;
      const saved = await this.userDomainRepository.save(domainUser);

      return successResponse('Avatar actualizado correctamente', {
        id: saved.id,
        name: saved.name,
        email: saved.email.value,
        avatarUrl: saved.avatarUrl,
      });
    } catch (error) {
      console.error('[UserService][updateAvatar] Error al subir avatar:', error);
      throw new UnauthorizedException('No se pudo actualizar el avatar');
    }
  }
}

