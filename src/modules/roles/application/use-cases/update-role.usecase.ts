import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { UpdateRoleDto } from '../../adapters/in/dtos/update-role.dto';
import {
  ROLE_READ_REPOSITORY,
  RoleReadRepository,
} from '../ports/role-read.repository';

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
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

    const nextDescription = dto.description;
    if (nextDescription !== role.description) {
      const exists = await this.roleReadRepository.existsByDescription(nextDescription);
      if (exists) {
        throw new ConflictException('Este rol ya existe');
      }
    }

    role.description = nextDescription;
    try {
      await this.roleRepository.save(role);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Este rol ya existe');
      }
      throw error;
    }

    return { message: 'Rol actualizado correctamente' };
  }
}
