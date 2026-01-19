import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { CreateRoleDto } from '../../adapters/in/dtos/create-role.dto';
import { RoleFactory } from '../../domain/factories/role.factory';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { ROLE_READ_REPOSITORY, RoleReadRepository  } from '../ports/role-read.repository';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(dto: CreateRoleDto, requesterRole: RoleType) {
    if (requesterRole !== RoleType.ADMIN) {
      throw new UnauthorizedException('No autorizado para crear roles');
    }

    const exists = await this.roleReadRepository.existsByDescription(dto.description);
    if (exists) {
      throw new UnauthorizedException('Este rol ya existe');
    }

    const role = RoleFactory.createNew({
      description: dto.description,
    });

    try {
      await this.roleRepository.save(role);
      return successResponse('Rol creado correctamente');
    } catch (error) {
      console.error('[CreateRoleUseCase] error:', error);
      throw new UnauthorizedException('Error al crear el rol');
    }
  }
}
