import { Repository } from 'typeorm';
import { TypeormUserRepository } from './typeorm-user.repository';
import { User as OrmUser } from '../entities/user.entity';
import { Email } from '../../../../domain/value-objects/email.vo';
import { UserMapper } from '../mappers/user.mapper';

describe('TypeormUserRepository', () => {
  const makeRepo = (overrides?: Partial<Repository<OrmUser>>) => {
    return new TypeormUserRepository(overrides as Repository<OrmUser>);
  };

  it('findById returns domain user when found', async () => {
    const ormUser = new OrmUser();
    ormUser.id = 'user-1';
    ormUser.name = 'Ana';
    ormUser.email = 'ana@example.com';
    ormUser.password = 'hash';
    ormUser.deleted = false;
    ormUser.role = { id: 'role-1' } as any;

    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue(ormUser),
    });

    const mapperSpy = jest.spyOn(UserMapper, 'toDomain');
    const result = await repo.findById('user-1');

    expect(mapperSpy).toHaveBeenCalledWith(ormUser);
    expect(result?.id).toBe('user-1');
  });

  it('findByEmail returns null when not found', async () => {
    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue(null),
    });

    const result = await repo.findByEmail(new Email('ana@example.com'));
    expect(result).toBeNull();
  });

  it('existsByEmail returns true when count > 0', async () => {
    const repo = makeRepo({
      count: jest.fn().mockResolvedValue(1),
    });

    const result = await repo.existsByEmail(new Email('ana@example.com'));
    expect(result).toBe(true);
  });

  it('existsByIdAndDeleted delegates to query builder', async () => {
    const getExists = jest.fn().mockResolvedValue(true);
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getExists,
      }),
    });

    const result = await repo.existsByIdAndDeleted('user-1', false);
    expect(result).toBe(true);
    expect(getExists).toHaveBeenCalled();
  });

  it('updateDeleted delegates to update query', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute,
      }),
    });

    await repo.updateDeleted('user-1', true);
    expect(execute).toHaveBeenCalled();
  });

  it('save maps and persists', async () => {
    const ormUser = new OrmUser();
    ormUser.id = 'user-1';
    ormUser.name = 'Ana';
    ormUser.email = 'ana@example.com';
    ormUser.password = 'hash';
    ormUser.deleted = false;
    ormUser.role = { id: 'role-1' } as any;

    const repo = makeRepo({
      create: jest.fn().mockReturnValue(ormUser),
      save: jest.fn().mockResolvedValue(ormUser),
    });

    const mapperSpy = jest.spyOn(UserMapper, 'toDomain');
    const domain = await repo.save(UserMapper.toDomain(ormUser));

    expect(mapperSpy).toHaveBeenCalled();
    expect(domain.id).toBe('user-1');
  });
});
