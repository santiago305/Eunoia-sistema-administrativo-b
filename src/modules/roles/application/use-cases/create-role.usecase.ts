import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { CreateRoleDto } from '../../adapters/in/dtos/create-role.dto';
import { RoleFactory } from '../../domain/factories/role.factory';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { ROLE_READ_REPOSITORY, RoleReadRepository  } from '../ports/role-read.repository';
import { RoleConflictApplicationError } from '../errors/role-conflict.error';
import { RoleForbiddenApplicationError } from '../errors/role-forbidden.error';

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
      throw new ForbiddenException(
        new RoleForbiddenApplicationError('No autorizado para crear roles').message,
      );
    }

    const normalizedDescription = dto.description.trim().toLowerCase();
    if (!normalizedDescription) {
      throw new BadRequestException('La descripcion no puede quedar vacia');
    }

    const exists = await this.roleReadRepository.existsByDescription(normalizedDescription);
    if (exists) {
      throw new ConflictException(new RoleConflictApplicationError().message);
    }

    const role = RoleFactory.createNew({
      description: normalizedDescription,
    });

    try {
      await this.roleRepository.save(role);
      return successResponse('Rol creado correctamente');
    } catch {
      throw new InternalServerErrorException('Error al crear el rol');
    }
  }
}
