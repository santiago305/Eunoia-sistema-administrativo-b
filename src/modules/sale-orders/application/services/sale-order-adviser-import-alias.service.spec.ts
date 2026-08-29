import { ConflictException } from '@nestjs/common';
import { SaleOrderAdviserImportAliasService } from './sale-order-adviser-import-alias.service';

describe('SaleOrderAdviserImportAliasService', () => {
  function makeService(existing: any = null) {
    const repository = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'alias-1', ...value })),
      createQueryBuilder: jest.fn(),
    };
    const advisers = { exist: jest.fn().mockResolvedValue(true) };
    const user = {
      id: 'adviser-1',
      name: 'Ana',
      email: 'ana@example.com',
      deleted: false,
    };
    const users = { findOne: jest.fn().mockResolvedValue(user) };
    const dataSource = { transaction: jest.fn() };
    const service = new SaleOrderAdviserImportAliasService(
      repository as any,
      advisers as any,
      users as any,
      dataSource as any,
    );
    return { service, repository, advisers, users };
  }

  it('creates a normalized external-name mapping for an active adviser', async () => {
    const f = makeService();

    await expect(f.service.create({
      externalName: ' Analucía   Pazos Arroyo ',
      adviserUserId: 'adviser-1',
      userId: 'admin-1',
    })).resolves.toEqual(expect.objectContaining({
      externalName: 'Analucía Pazos Arroyo',
      adviserUserId: 'adviser-1',
      adviser: {
        id: 'adviser-1',
        name: 'Ana',
        email: 'ana@example.com',
      },
    }));

    expect(f.repository.create).toHaveBeenCalledWith(expect.objectContaining({
      normalizedName: 'analucia pazos arroyo',
      adviserUserId: 'adviser-1',
      isActive: true,
    }));
  });

  it('rejects a duplicated active external name', async () => {
    const f = makeService({ id: 'existing', isDeleted: false });

    await expect(f.service.create({
      externalName: 'Analucia Pazos Arroyo',
      adviserUserId: 'adviser-1',
      userId: 'admin-1',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(f.repository.save).not.toHaveBeenCalled();
  });
});
