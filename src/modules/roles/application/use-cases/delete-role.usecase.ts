import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { RoleNotFoundApplicationError } from '../errors/role-not-found.error';

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
    throw new BadRequestException(
      'Para desactivar un rol debes usar el flujo con reasignación de usuarios',
    );
  }
}
