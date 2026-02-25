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

  async updateSecurityById(
    id: string,
    params: {
      failedLoginAttempts?: number;
      lockoutLevel?: number;
      lockedUntil?: Date | null;
      securityDisabledAt?: Date | null;
    },
  ): Promise<void> {
    const setPayload: Record<string, number | Date | null> = {};
    if (Object.prototype.hasOwnProperty.call(params, 'failedLoginAttempts')) {
      if (params.failedLoginAttempts === undefined) {
        throw new TypeError('failedLoginAttempts no puede ser undefined; omite la clave para no actualizar');
      }
      setPayload.failedLoginAttempts = params.failedLoginAttempts ?? 0;
    }
    if (Object.prototype.hasOwnProperty.call(params, 'lockoutLevel')) {
      if (params.lockoutLevel === undefined) {
        throw new TypeError('lockoutLevel no puede ser undefined; omite la clave para no actualizar');
      }
      setPayload.lockoutLevel = params.lockoutLevel ?? 0;
    }
    if (Object.prototype.hasOwnProperty.call(params, 'lockedUntil')) {
      if (params.lockedUntil === undefined) {
        throw new TypeError('lockedUntil no puede ser undefined; usa null para limpiar u omite la clave');
      }
      setPayload.lockedUntil = params.lockedUntil ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(params, 'securityDisabledAt')) {
      if (params.securityDisabledAt === undefined) {
        throw new TypeError('securityDisabledAt no puede ser undefined; usa null para limpiar u omite la clave');
      }
      setPayload.securityDisabledAt = params.securityDisabledAt ?? null;
    }

    if (Object.keys(setPayload).length === 0) {
      return;
    }

    await this.ormRepository
      .createQueryBuilder()
      .update(OrmUser)
      .set(setPayload)
      .where('id = :id', { id })
      .execute();
  }

  async save(user: User): Promise<User> {
    const ormUser = this.ormRepository.create(UserMapper.toPersistence(user));
    const saved = await this.ormRepository.save(ormUser);

    return UserMapper.toDomain(saved);
  }
}


