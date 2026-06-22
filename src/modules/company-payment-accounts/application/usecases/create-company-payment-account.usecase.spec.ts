import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { COMPANY_REPOSITORY } from "src/modules/companies/domain/ports/company.repository";
import { COMPANY_PAYMENT_ACCOUNT_REPOSITORY } from "../../domain/ports/company-payment-account.repository";
import { CreateCompanyPaymentAccountUsecase } from "./create-company-payment-account.usecase";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { CompanyPaymentAccount } from "../../domain/entity/company-payment-account";

describe("CreateCompanyPaymentAccountUsecase", () => {
  it("creates a company payment account with a masked label", async () => {
    const companyRepo = { findById: jest.fn().mockResolvedValue({ id: "company-1" }) };
    const accountRepo = {
      findDuplicate: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (account) => CompanyPaymentAccount.create({
        companyPaymentAccountId: "account-1",
        companyId: account.companyId,
        type: account.type,
        name: account.name,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountLastFour: account.accountLastFour,
        cardLastFour: account.cardLastFour,
        walletName: account.walletName,
        currency: account.currency,
        isActive: account.isActive,
      })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateCompanyPaymentAccountUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: COMPANY_REPOSITORY, useValue: companyRepo },
        { provide: COMPANY_PAYMENT_ACCOUNT_REPOSITORY, useValue: accountRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateCompanyPaymentAccountUsecase);
      const result = await usecase.execute({
        companyId: "company-1",
        type: "BANK_ACCOUNT",
        name: "BCP Empresa",
        bankName: "BCP",
        accountNumber: "1912345678901",
        currency: CurrencyType.PEN,
      });

      expect(result.data.maskedLabel).toBe("BCP Empresa ****8901");
      expect(accountRepo.create).toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it("rejects duplicate active account numbers for the same company", async () => {
    const companyRepo = { findById: jest.fn().mockResolvedValue({ id: "company-1" }) };
    const accountRepo = {
      findDuplicate: jest.fn().mockResolvedValue({ companyPaymentAccountId: "account-1" }),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateCompanyPaymentAccountUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: COMPANY_REPOSITORY, useValue: companyRepo },
        { provide: COMPANY_PAYMENT_ACCOUNT_REPOSITORY, useValue: accountRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateCompanyPaymentAccountUsecase);
      await expect(
        usecase.execute({
          companyId: "company-1",
          type: "BANK_ACCOUNT",
          name: "BCP Empresa",
          accountNumber: "1912345678901",
          currency: CurrencyType.PEN,
        }),
      ).rejects.toThrow(ConflictException);
      expect(accountRepo.create).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});
