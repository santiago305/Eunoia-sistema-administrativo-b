import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { COMPANY_REPOSITORY } from "src/modules/companies/domain/ports/company.repository";
import { BANK_ACCOUNT_REPOSITORY } from "src/modules/bank-accounts/domain/ports/bank-account.repository";
import { CreateBankAccountUsecase } from "./create.usecase";

describe("CreateBankAccountUsecase", () => {
  it("rejects when (companyId, number) already exists", async () => {
    const companyRepo = { findById: jest.fn() };
    const bankAccountRepo = { findDuplicate: jest.fn(), create: jest.fn() };

    companyRepo.findById.mockResolvedValue({ id: "company-1" });
    bankAccountRepo.findDuplicate.mockResolvedValue({ bankAccountId: "acc-1" });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateBankAccountUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: COMPANY_REPOSITORY, useValue: companyRepo },
        { provide: BANK_ACCOUNT_REPOSITORY, useValue: bankAccountRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateBankAccountUsecase);
      await expect(
        usecase.execute({ companyId: "company-1", name: "BCP", number: " 123 " }),
      ).rejects.toThrow(ConflictException);

      expect(bankAccountRepo.create).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});

