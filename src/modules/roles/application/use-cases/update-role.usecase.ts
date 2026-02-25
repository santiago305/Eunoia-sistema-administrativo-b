import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { UpdateRoleDto } from '../../adapters/in/dtos/update-role.dto';

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(id: string, dto: UpdateRoleDto) {
    if (dto.description === undefined) {
      throw new BadRequestException('Debe enviar al menos un campo para actualizar');
    }

    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    role.description = dto.description;
    await this.roleRepository.save(role);

    return { message: 'Rol actualizado correctamente' };
  }
}
