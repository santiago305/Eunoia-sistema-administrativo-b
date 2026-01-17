import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { User as OrmUser } from '../orm-entities/user.entity';
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

  async save(user: User): Promise<User> {
    const ormUser = this.ormRepository.create(UserMapper.toPersistence(user));
    const saved = await this.ormRepository.save(ormUser);

    return UserMapper.toDomain(saved);
  }
}
