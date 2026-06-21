import { seedBankAccounts } from './bank-account.seeder';

describe('seedBankAccounts', () => {
  const company = { id: 'company-1', name: 'Eunoia' };

  function setup(existing: Record<string, unknown>[] = []) {
    const companyRepo = { findOne: jest.fn().mockResolvedValue(company) };
    const accountRepo = {
      findOne: jest.fn(({ where: { name } }) => Promise.resolve(existing.find((item) => item.name === name) ?? null)),
      create: jest.fn((value) => value),
      merge: jest.fn((current, value) => ({ ...current, ...value })),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValueOnce(companyRepo).mockReturnValue(accountRepo),
    };
    return { dataSource: dataSource as never, companyRepo, accountRepo };
  }

  it('creates the three active accounts without numbers for the first active company', async () => {
    const { dataSource, companyRepo, accountRepo } = setup();

    await seedBankAccounts(dataSource);

    expect(companyRepo.findOne).toHaveBeenCalledWith({ where: { isActive: true }, order: { createdAt: 'ASC' } });
    expect(accountRepo.save.mock.calls.map(([value]) => value)).toEqual([
      { companyId: company.id, name: 'Jose Gerardo', number: null, isActive: true },
      { companyId: company.id, name: 'Nexara', number: null, isActive: true },
      { companyId: company.id, name: 'Curier', number: null, isActive: true },
    ]);
  });

  it('updates matching accounts instead of duplicating them', async () => {
    const existing = [{ id: 'account-1', companyId: company.id, name: 'Nexara', number: '123', isActive: false }];
    const { dataSource, accountRepo } = setup(existing);

    await seedBankAccounts(dataSource);

    expect(accountRepo.merge).toHaveBeenCalledWith(existing[0], { number: null, isActive: true });
  });

  it('fails clearly when there is no active company', async () => {
    const { dataSource, companyRepo } = setup();
    companyRepo.findOne.mockResolvedValue(null);

    await expect(seedBankAccounts(dataSource)).rejects.toThrow('No hay una empresa activa para sembrar cuentas bancarias');
  });
});
