import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { RolesService } from 'src/modules/roles/use-cases/roles.service';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { Email, Password, RoleId, UserFactory } from 'src/modules/users/domain';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly rolesService: RolesService,
  ) {}

  async execute(dto: CreateUserDto, requesterRole: RoleType) {
    const isAdmin = requesterRole === RoleType.ADMIN;
    const isModerator = requesterRole === RoleType.MODERATOR;

    if (!isAdmin && !isModerator) {
      throw new UnauthorizedException('No autorizado para crear usuarios');
    }

    const exists = await this.userRepository.existsByEmail(new Email(dto.email));
    if (exists) {
      throw new UnauthorizedException('Este email ya estA registrado');
    }

    const hashedPassword = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    let targetRoleId: string;
    let targetRoleDescription: string;

    if (dto.roleId) {
      await this.rolesService.isRoleActive(dto.roleId);
      const roleResult = await this.rolesService.findOne(dto.roleId);
      targetRoleId = roleResult.data.id;
      targetRoleDescription = roleResult.data.description;
    } else {
      const roleResult = await this.rolesService.findOneDescription(RoleType.ADVISER);
      targetRoleId = roleResult.data.id;
      targetRoleDescription = RoleType.ADVISER;
    }

    if (isModerator && targetRoleDescription !== RoleType.ADVISER) {
      throw new UnauthorizedException('Solo puedes crear asesores');
    }
    if (isAdmin && targetRoleDescription === RoleType.ADMIN) {
      throw new UnauthorizedException('No puedes crear administradores');
    }

    const domainUser = UserFactory.createNew({
      name: dto.name,
      email: new Email(dto.email),
      password: new Password(hashedPassword),
      roleId: new RoleId(targetRoleId),
      avatarUrl: dto.avatarUrl,
    });

    try {
      await this.userRepository.save(domainUser);
      return successResponse('Usuario creado correctamente');
    } catch (error) {
      console.error('[CreateUserUseCase] error al crear un usuario: ', error);
      throw new UnauthorizedException('Se ha producido un error al crear al usuario');
    }
  }
}
