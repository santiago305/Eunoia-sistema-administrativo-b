import { seedCompanyPaymentAccounts } from "./company-payment-account.seeder";
import { CompanyEntity } from "src/modules/companies/adapters/out/persistence/typeorm/entities/company.entity";
import { CompanyPaymentAccountEntity } from "../../adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

describe("seedCompanyPaymentAccounts", () => {
  it("seeds the default company payment accounts used by purchase payments", async () => {
    const company = { id: "company-1", isActive: true, createdAt: new Date("2026-01-01") };
    const companyRepo = {
      findOne: jest.fn().mockResolvedValue(company),
    };
    const accountRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((input) => input),
      merge: jest.fn((existing, input) => ({ ...existing, ...input })),
      save: jest.fn(async (input) => input),
    };
    const dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === CompanyEntity) return companyRepo;
        if (entity === CompanyPaymentAccountEntity) return accountRepo;
        throw new Error("Unexpected repository");
      }),
    };

    await seedCompanyPaymentAccounts(dataSource as any);

    expect(accountRepo.create).toHaveBeenCalledTimes(3);
    expect(accountRepo.create).toHaveBeenNthCalledWith(1, {
      companyId: "company-1",
      type: "BANK_ACCOUNT",
      name: "Jose Gerardo",
      bankName: "Jose Gerardo",
      accountNumber: null,
      accountLastFour: null,
      currency: CurrencyType.PEN,
      isActive: true,
      isDefault: true,
    });
    expect(accountRepo.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      name: "Nexara",
      isDefault: false,
    }));
    expect(accountRepo.create).toHaveBeenNthCalledWith(3, expect.objectContaining({
      name: "Curier",
      isDefault: false,
    }));
    expect(accountRepo.save).toHaveBeenCalledTimes(3);
  });
});
