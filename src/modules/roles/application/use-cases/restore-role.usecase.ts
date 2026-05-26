import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { RoleNotFoundApplicationError } from '../errors/role-not-found.error';

@Injectable()
export class RestoreRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(id: string) {
    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new NotFoundException(new RoleNotFoundApplicationError().message);
    }
    if (!role.deleted) {
      throw new BadRequestException('El rol ya se encuentra activo');
    }
    await this.roleRepository.updateDeleted(id, false);

    return { message: 'Rol restaurado correctamente' };
  }
}
