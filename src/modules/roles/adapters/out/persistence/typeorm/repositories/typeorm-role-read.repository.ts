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
    return this.ormRepository.find({
      select: ['id', 'description'],
      where: { deleted: false },
      order: { description: 'ASC' },
    });
  }

  async findById(id: string) {
    return this.ormRepository.findOne({
      where: { id, deleted: false },
      select: ['id', 'description', 'deleted', 'createdAt'],
    });
  }
  async findByDescription(description: string) {
    return this.ormRepository.findOne({
      where: { description, deleted: false },
    });
  }

  async existsByDescription(description: string) {
    const role = await this.ormRepository.findOne({
      where: { description, deleted: false },
    });
    return !!role;
  }
}
