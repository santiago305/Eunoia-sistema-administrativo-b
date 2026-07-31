import { ListSaleOrderAuditUsecase } from "./list-sale-order-audit.usecase";

describe("ListSaleOrderAuditUsecase", () => {
  it("maps sale order audit rows with executor data", async () => {
    const saleOrderRepo = {
      listAudit: jest.fn().mockResolvedValue([
        {
          id: "audit-1",
          saleOrderId: "order-1",
          createdAt: new Date("2026-07-31T10:00:00.000Z"),
          executedBy: "user-1",
          executedByName: "Admin",
          executedByEmail: "admin@example.test",
          actionExecution: "restore",
        },
      ]),
    };
    const usecase = new ListSaleOrderAuditUsecase(saleOrderRepo as any);

    const result = await usecase.execute("order-1");

    expect(saleOrderRepo.listAudit).toHaveBeenCalledWith("order-1");
    expect(result).toEqual([
      {
        id: "audit-1",
        saleOrderId: "order-1",
        createdAt: "2026-07-31T10:00:00.000Z",
        executedBy: { id: "user-1", name: "Admin", email: "admin@example.test" },
        actionExecution: "restore",
      },
    ]);
  });
});
