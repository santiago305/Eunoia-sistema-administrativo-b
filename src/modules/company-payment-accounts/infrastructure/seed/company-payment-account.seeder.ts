import { DataSource } from "typeorm";
import { CompanyEntity } from "src/modules/companies/adapters/out/persistence/typeorm/entities/company.entity";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { CompanyPaymentAccountEntity } from "../../adapters/out/persistence/typeorm/entities/company-payment-account.entity";

const COMPANY_PAYMENT_ACCOUNT_NAMES = ["Jose Gerardo", "Nexara", "Curier"] as const;

export async function seedCompanyPaymentAccounts(dataSource: DataSource): Promise<void> {
  const companyRepository = dataSource.getRepository(CompanyEntity);
  const accountRepository = dataSource.getRepository(CompanyPaymentAccountEntity);
  const company = await companyRepository.findOne({
    where: { isActive: true },
    order: { createdAt: "ASC" },
  });

  if (!company) {
    throw new Error("No hay una empresa activa para sembrar cuentas de pago");
  }

  for (const [index, name] of COMPANY_PAYMENT_ACCOUNT_NAMES.entries()) {
    const existing = await accountRepository.findOne({
      where: { companyId: company.id, name },
    });
    const payload = {
      companyId: company.id,
      type: "BANK_ACCOUNT" as const,
      name,
      bankName: name,
      accountNumber: null,
      accountLastFour: null,
      currency: CurrencyType.PEN,
      isActive: true,
      isDefault: index === 0,
    };
    const account = existing
      ? accountRepository.merge(existing, payload)
      : accountRepository.create(payload);
    await accountRepository.save(account);
  }

  console.log("Cuentas de pago de empresa sembradas correctamente");
}
