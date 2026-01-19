import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleRepository } from '../../../../../application/ports/role.repository';
import { Role as OrmRole } from '../entities/role.entity';

@Injectable()
export class TypeormRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(OrmRole)
    private readonly ormRepository: Repository<OrmRole>
  ) {}

  async save(role: OrmRole): Promise<OrmRole> {
    return this.ormRepository.save(role);
  }

  async findById(id: string): Promise<OrmRole | null> {
    return this.ormRepository.findOne({
      where: { id },
    });
  }

  async update(role: OrmRole): Promise<OrmRole> {
    return this.ormRepository.save(role);
  }

  async updateDeleted(id: string, deleted: boolean): Promise<void> {
    await this.ormRepository.update(id, { deleted });
  }
}
