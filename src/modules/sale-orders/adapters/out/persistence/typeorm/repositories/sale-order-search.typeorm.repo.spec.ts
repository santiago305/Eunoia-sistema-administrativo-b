import { SaleOrderSearchTypeormRepository } from "./sale-order-search.typeorm.repo";

describe("SaleOrderSearchTypeormRepository", () => {
  it("uses active company payment accounts for the bank account catalog", async () => {
    const storage = {
      listState: jest.fn().mockResolvedValue({ recent: [], metrics: [] }),
    };
    const clientRepo = { find: jest.fn().mockResolvedValue([]) };
    const warehouseRepo = { find: jest.fn().mockResolvedValue([]) };
    const workflowRepo = { find: jest.fn().mockResolvedValue([]) };
    const stateRepo = { find: jest.fn().mockResolvedValue([]) };
    const companyPaymentAccountRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: "company-account-1",
          name: "BCP Empresa",
          accountNumber: "001",
          isActive: true,
        },
      ]),
    };
    const repository = new SaleOrderSearchTypeormRepository(
      storage as any,
      clientRepo as any,
      warehouseRepo as any,
      workflowRepo as any,
      stateRepo as any,
      companyPaymentAccountRepo as any,
    );

    const result = await repository.listState({ userId: "user-1", tableKey: "sale-orders" });

    expect(companyPaymentAccountRepo.find).toHaveBeenCalledWith({ where: { isActive: true } });
    expect(result.bankAccounts).toEqual([
      {
        bankAccountId: "company-account-1",
        label: "BCP Empresa (001)",
      },
    ]);
  });
});
