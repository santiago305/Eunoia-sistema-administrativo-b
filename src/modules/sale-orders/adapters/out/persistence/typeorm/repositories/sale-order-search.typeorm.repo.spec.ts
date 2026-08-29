import { SaleOrderSearchTypeormRepository } from "./sale-order-search.typeorm.repo";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { UbigeoProvinceEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-province.entity";
import { UbigeoDistrictEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-district.entity";

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
    const workflowRepo = {
      find: jest.fn().mockResolvedValue([
        { id: "workflow-1", name: "Abonado envio", revision: 1 },
        { id: "workflow-2", name: "Abonado envio", revision: 2 },
      ]),
    };
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
    expect(workflowRepo.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { createdAt: "DESC" },
    });
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
    expect(result.workflows).toEqual([
      { workflowId: "workflow-2", label: "Abonado envio v2" },
      { workflowId: "workflow-1", label: "Abonado envio v1" },
    ]);
  });

  it("preserves ubigeo parent ids for chained order filters", async () => {
    const storage = { listState: jest.fn().mockResolvedValue({ recent: [], metrics: [] }) };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === UbigeoProvinceEntity) return {
          find: jest.fn().mockResolvedValue([{ id: "2001", name: "Piura", departmentId: "20" }]),
        };
        if (entity === UbigeoDistrictEntity) return {
          find: jest.fn().mockResolvedValue([{ id: "200101", name: "Piura", provinceId: "2001" }]),
        };
        return { find: jest.fn().mockResolvedValue([]) };
      }),
    };
    const repository = new SaleOrderSearchTypeormRepository(
      storage as any,
      { find: jest.fn().mockResolvedValue([]), manager } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
    );

    const result = await repository.listState({ userId: "user-1", tableKey: "sale-orders" });
    expect(result.provinces).toEqual([{ id: "2001", label: "Piura", departmentId: "20" }]);
    expect(result.districts).toEqual([{ id: "200101", label: "Piura", provinceId: "2001" }]);
  });
});
