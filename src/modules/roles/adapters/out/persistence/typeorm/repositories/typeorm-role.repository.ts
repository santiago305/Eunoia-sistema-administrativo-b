import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleRepository } from '../../../../../application/ports/role.repository';
import { Role as DomainRole } from '../../../../../domain/entities/role.entity';
import { RoleMapper } from '../mappers/role.mapper';
import { Role as OrmRole } from '../entities/role.entity';

@Injectable()
export class TypeormRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(OrmRole)
    private readonly ormRepository: Repository<OrmRole>
  ) {}

  async save(role: DomainRole): Promise<DomainRole> {
    const saved = await this.ormRepository.save(
      this.ormRepository.create(RoleMapper.toPersistence(role))
    );
    return RoleMapper.toDomain(saved);
  }

  async findById(id: string): Promise<DomainRole | null> {
    const role = await this.ormRepository.findOne({
      where: { roleId: id },
    });
    return role ? RoleMapper.toDomain(role) : null;
  }

  async update(role: DomainRole): Promise<DomainRole> {
    return this.save(role);
  }

  async updateDeleted(id: string, deleted: boolean): Promise<void> {
    await this.ormRepository.update(id, { deleted });
  }
}
