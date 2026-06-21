import { DataSource } from 'typeorm';
import { CompanyEntity } from 'src/modules/companies/adapters/out/persistence/typeorm/entities/company.entity';
import { BankAccountEntity } from '../../adapters/out/persistence/typeorm/entities/bank-account.entity';

const BANK_ACCOUNT_NAMES = ['Jose Gerardo', 'Nexara', 'Curier'] as const;

export async function seedBankAccounts(dataSource: DataSource): Promise<void> {
  const companyRepository = dataSource.getRepository(CompanyEntity);
  const accountRepository = dataSource.getRepository(BankAccountEntity);
  const company = await companyRepository.findOne({
    where: { isActive: true },
    order: { createdAt: 'ASC' },
  });

  if (!company) {
    throw new Error('No hay una empresa activa para sembrar cuentas bancarias');
  }

  for (const name of BANK_ACCOUNT_NAMES) {
    const existing = await accountRepository.findOne({
      where: { companyId: company.id, name },
    });
    const account = existing
      ? accountRepository.merge(existing, { number: null, isActive: true })
      : accountRepository.create({ companyId: company.id, name, number: null, isActive: true });
    await accountRepository.save(account);
  }

  console.log('Cuentas bancarias sembradas correctamente');
}
