import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleReadRepository } from '../../../../../application/ports/role-read.repository';
import { Role as OrmRole } from '../entities/role.entity';

@Injectable()
export class TypeormRoleReadRepository implements RoleReadRepository {
  constructor(
    @InjectRepository(OrmRole)
    private readonly ormRepository: Repository<OrmRole>
  ) {}

  async listRoles() {
    const roles = await this.ormRepository.find({
      select: ['roleId', 'description', 'deleted', 'createdAt'],
      where: { deleted: false },
      order: { description: 'ASC' },
    });

    return roles.map((role) => ({
      id: role.roleId,
      description: role.description,
      deleted: role.deleted,
      createdAt: role.createdAt,
    }));
  }

  async findById(id: string) {
    const role = await this.ormRepository.findOne({
      where: { roleId: id, deleted: false },
      select: ['roleId', 'description', 'deleted', 'createdAt'],
    });

    if (!role) return null;

    return {
      id: role.roleId,
      description: role.description,
      deleted: role.deleted,
      createdAt: role.createdAt,
    };
  }
  async findByDescription(description: string) {
    const role = await this.ormRepository.findOne({
      where: { description, deleted: false },
    });

    if (!role) return null;

    return {
      id: role.roleId,
      description: role.description,
      deleted: role.deleted,
      createdAt: role.createdAt,
    };
  }

  async existsByDescription(description: string) {
    const role = await this.ormRepository.findOne({
      where: { description, deleted: false },
    });
    return !!role;
  }
}
