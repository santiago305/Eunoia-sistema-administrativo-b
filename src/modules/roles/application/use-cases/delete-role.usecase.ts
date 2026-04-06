import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { RoleForbiddenApplicationError } from '../errors/role-forbidden.error';
import { RoleNotFoundApplicationError } from '../errors/role-not-found.error';

const PROTECTED_SYSTEM_ROLES = new Set<string>([
  RoleType.ADMIN,
  RoleType.MODERATOR,
  RoleType.ADVISER,
]);

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(id: string) {
    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new NotFoundException(new RoleNotFoundApplicationError().message);
    }
    const normalizedDescription = (role.description || '').trim().toLowerCase();
    if (PROTECTED_SYSTEM_ROLES.has(normalizedDescription)) {
      throw new ForbiddenException(
        new RoleForbiddenApplicationError('No se puede eliminar un rol base del sistema').message,
      );
    }

    await this.roleRepository.updateDeleted(id, true);

    return { message: 'Rol eliminado correctamente' };
  }
}
