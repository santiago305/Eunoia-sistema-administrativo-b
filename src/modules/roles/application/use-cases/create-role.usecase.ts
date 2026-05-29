import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { CreateRoleDto } from '../../adapters/in/dtos/create-role.dto';
import { RoleFactory } from '../../domain/factories/role.factory';
import { successResponse } from 'src/shared/response-standard/response';
import { ROLE_READ_REPOSITORY, RoleReadRepository  } from '../ports/role-read.repository';
import { RoleConflictApplicationError } from '../errors/role-conflict.error';
import { RoleType } from 'src/shared/constantes/constants';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(dto: CreateRoleDto, requester: { userId: string; role?: RoleType | null }) {
    const normalizedDescription = dto.description.trim().toLowerCase();
    if (!normalizedDescription) {
      throw new BadRequestException('La descripcion no puede quedar vacia');
    }

    const existing = await this.roleReadRepository.findByDescription(normalizedDescription, { includeDeleted: true });
    if (existing && !existing.deleted) {
      throw new ConflictException(new RoleConflictApplicationError().message);
    }
    if (existing?.deleted) {
      const role = await this.roleRepository.findById(existing.id);
      if (!role) {
        throw new ConflictException(new RoleConflictApplicationError().message);
      }
      role.deleted = false;
      role.createdByUserId = requester.userId;
      const restored = await this.roleRepository.save(role);
      return successResponse('Rol reactivado correctamente', {
        id: restored.id,
        description: restored.description,
      });
    }

    const role = RoleFactory.createNew({
      description: normalizedDescription,
      createdByUserId: requester.userId,
    });

    try {
      const created = await this.roleRepository.save(role);
      return successResponse('Rol creado correctamente', {
        id: created.id,
        description: created.description,
      });
    } catch {
      throw new InternalServerErrorException('Error al crear el rol');
    }
  }
}
