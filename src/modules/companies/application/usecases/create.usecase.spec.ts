import { ConflictException } from "@nestjs/common";
import { CreateCompanyUsecase } from "./create.usecase";

describe("CreateCompanyUsecase", () => {
  it("assigns the new company to the authenticated creator in the same transaction", async () => {
    const tx = {};
    const runInTransaction = jest.fn(async (work: (transaction: object) => Promise<unknown>) => work(tx));
    const companyRepo = {
      findSingle: jest.fn().mockResolvedValueOnce(null),
      existsByEmail: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({ companyId: "company-eunoia", name: "Eunoia" }),
    };
    const userRepository = {
      assignCompany: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new CreateCompanyUsecase(
      { runInTransaction } as never,
      companyRepo as never,
      userRepository as never,
    );

    await useCase.execute({ name: "Eunoia", ruc: "20123456789" } as never, "user-owner");

    expect(companyRepo.create).toHaveBeenCalledWith(expect.anything(), tx);
    expect(userRepository.assignCompany).toHaveBeenCalledWith("user-owner", "company-eunoia", tx);
  });

  it("does not assign a company when one already exists", async () => {
    const runInTransaction = jest.fn(async (work: (transaction: object) => Promise<unknown>) => work({}));
    const companyRepo = {
      findSingle: jest.fn().mockResolvedValue({ companyId: "company-existing" }),
      create: jest.fn(),
    };
    const userRepository = { assignCompany: jest.fn() };

    const useCase = new CreateCompanyUsecase(
      { runInTransaction } as never,
      companyRepo as never,
      userRepository as never,
    );

    await expect(useCase.execute({ name: "Eunoia" } as never, "user-owner")).rejects.toBeInstanceOf(ConflictException);
    expect(userRepository.assignCompany).not.toHaveBeenCalled();
  });
});
