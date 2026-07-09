import { SaleOrderSearchTypeormRepository } from "./sale-order-search.typeorm.repo";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";

describe("SaleOrderSearchTypeormRepository", () => {
  it("uses active company payment accounts and sale order users for catalogs", async () => {
    const storage = {
      listState: jest.fn().mockResolvedValue({ recent: [], metrics: [] }),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === SaleOrderEntity) {
          return {
            find: jest.fn().mockResolvedValue([
              { createdBy: "creator-1", assignedBy: "assignee-1" },
              { createdBy: "creator-1", assignedBy: null },
              { createdBy: "creator-2", assignedBy: "assignee-1" },
            ]),
          };
        }
        if (entity === User) {
          return {
            find: jest.fn().mockResolvedValue([
              { id: "creator-1", name: "Santiago", email: "s@test.com" },
              { id: "creator-2", name: "Brenda", email: "b@test.com" },
              { id: "assignee-1", name: "Ana", email: "a@test.com" },
            ]),
          };
        }
        return { find: jest.fn().mockResolvedValue([]) };
      }),
    };
    const clientRepo = { find: jest.fn().mockResolvedValue([]), manager };
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
    expect(result.creators).toEqual([
      { userId: "creator-2", label: "Brenda (b@test.com)" },
      { userId: "creator-1", label: "Santiago (s@test.com)" },
    ]);
    expect(result.assignees).toEqual([
      { userId: "assignee-1", label: "Ana (a@test.com)" },
    ]);
  });
});
