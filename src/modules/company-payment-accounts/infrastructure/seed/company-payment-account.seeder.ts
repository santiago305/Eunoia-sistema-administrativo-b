import { DataSource } from "typeorm";
import { CompanyEntity } from "src/modules/companies/adapters/out/persistence/typeorm/entities/company.entity";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { CompanyPaymentAccount } from "../../domain/entity/company-payment-account";
import { CompanyPaymentAccountEntity } from "../../adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import {
  encryptPaymentAccountSensitiveData,
  hashPaymentAccountIdentifier,
} from "../security/payment-account-sensitive-data";

const seedAccounts = [
  CompanyPaymentAccount.create({
    companyId: "seed-company",
    type: "CASH",
    usage: "BOTH",
    name: "Caja principal",
    currency: CurrencyType.PEN,
    isDefault: true,
  }),
  CompanyPaymentAccount.create({
    companyId: "seed-company",
    type: "BANK_ACCOUNT",
    usage: "OUTFLOW",
    name: "BCP Operaciones",
    institutionName: "BCP",
    accountNumber: "1910000000001",
    holderName: "Empresa",
    currency: CurrencyType.PEN,
  }),
  CompanyPaymentAccount.create({
    companyId: "seed-company",
    type: "DIGITAL_WALLET",
    usage: "BOTH",
    name: "Billetera corporativa",
    walletProvider: "Yape",
    walletPhone: "999999999",
    currency: CurrencyType.PEN,
  }),
];

export async function seedCompanyPaymentAccounts(dataSource: DataSource): Promise<void> {
  const companyRepository = dataSource.getRepository(CompanyEntity);
  const accountRepository = dataSource.getRepository(CompanyPaymentAccountEntity);
  const company = await companyRepository.findOne({
    where: { isActive: true },
    order: { createdAt: "ASC" },
  });

  if (!company) throw new Error("No hay una empresa activa para sembrar cuentas de tesoreria");

  for (const seed of seedAccounts) {
    const existing = await accountRepository.findOne({
      where: { companyId: company.id, name: seed.name },
    });
    const payload = {
      companyId: company.id,
      type: seed.type,
      usage: seed.usage,
      name: seed.name,
      institutionName: seed.institutionName,
      bankName: seed.institutionName,
      accountNumber: null,
      accountLastFour: seed.accountLastFour,
      cciLastFour: seed.cciLastFour,
      cardLastFour: seed.cardLastFour,
      walletProvider: seed.walletProvider,
      walletName: seed.walletProvider,
      walletPhoneLastFour: seed.walletPhoneLastFour,
      holderName: seed.holderName,
      sensitiveIdentifierEncrypted: encryptPaymentAccountSensitiveData({
        accountNumber: seed.accountNumber,
        cci: seed.cci,
        walletPhone: seed.walletPhone,
      }),
      sensitiveIdentifierHash: hashPaymentAccountIdentifier(seed),
      maskedLabel: seed.maskedLabel,
      currency: seed.currency,
      isActive: true,
      isDefault: seed.isDefault,
    };
    const account = existing ? accountRepository.merge(existing, payload) : accountRepository.create(payload);
    await accountRepository.save(account);
  }

  console.log("Cuentas de tesoreria de empresa sembradas correctamente");
}
