import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { successResponse } from 'src/shared/response-standard/response';
import { RoleNotFoundApplicationError } from '../errors/role-not-found.error';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { Repository } from 'typeorm';
import { MASTER_ROLE_DESCRIPTION } from 'src/shared/constantes/constants';

@Injectable()
export class DeactivateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(
    roleId: string,
    params: {
      replacementRoleId: string;
      confirmationText: string;
    },
  ) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(new RoleNotFoundApplicationError().message);
    }
    if (role.deleted) {
      throw new BadRequestException('Rol ya esta desactivado');
    }
    if (String(role.description ?? '').trim().toLowerCase() === MASTER_ROLE_DESCRIPTION) {
      throw new BadRequestException('El rol maestro no puede desactivarse');
    }

    const replacementRole = await this.roleRepository.findById(params.replacementRoleId);
    if (!replacementRole || replacementRole.deleted) {
      throw new NotFoundException('Rol de reemplazo invalido');
    }
    if (replacementRole.id === role.id) {
      throw new BadRequestException('Debes seleccionar un rol diferente como reemplazo');
    }

    const expectedConfirmationText = `Eliminar ${role.description}`;
    if (params.confirmationText.trim() !== expectedConfirmationText) {
      throw new BadRequestException('Texto de confirmacion invalido');
    }

    await this.userRepository.query(
      'UPDATE users SET role_id = $1 WHERE role_id = $2',
      [replacementRole.id, role.id],
    );
    await this.roleRepository.updateDeleted(role.id!, true);

    return successResponse('Rol desactivado y usuarios reasignados', {
      roleId: role.id,
      replacementRoleId: replacementRole.id,
    });
  }
}
