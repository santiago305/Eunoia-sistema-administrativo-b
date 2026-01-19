import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '../../../../../application/ports/user.repository';
import { User } from '../../../../../domain/entities/user.entity';
import { Email } from '../../../../../domain/value-objects/email.vo';
import { User as OrmUser } from '../entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class TypeormUserRepository implements UserRepository {
  constructor(
    @InjectRepository(OrmUser)
    private readonly ormRepository: Repository<OrmUser>
  ) {}

  async findById(id: string): Promise<User | null> {
    const ormUser = await this.ormRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    return ormUser ? UserMapper.toDomain(ormUser) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const ormUser = await this.ormRepository.findOne({
      where: { email: email.value },
      relations: ['role'],
    });

    return ormUser ? UserMapper.toDomain(ormUser) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.ormRepository.count({
      where: { email: email.value },
    });

    return count > 0;
  }

  async existsByIdAndDeleted(id: string, deleted: boolean): Promise<boolean> {
    return this.ormRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .andWhere('user.deleted = :deleted', { deleted })
      .getExists();
  }

  async updateDeleted(id: string, deleted: boolean): Promise<void> {
    await this.ormRepository
      .createQueryBuilder()
      .update(OrmUser)
      .set({ deleted })
      .where('id = :id', { id })
      .execute();
  }

  async save(user: User): Promise<User> {
    const ormUser = this.ormRepository.create(UserMapper.toPersistence(user));
    const saved = await this.ormRepository.save(ormUser);

    return UserMapper.toDomain(saved);
  }
}


