import { ListProductCatalogInventoryLedgerMovements } from "./list-inventory-ledger-movements.usecase";

describe("ListProductCatalogInventoryLedgerMovements", () => {
  it("converts date-only range to full America/Lima days", async () => {
    const repo = {
      listMovementsPaged: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const searchStorage = {
      touchRecentSearch: jest.fn(),
    };
    const usecase = new ListProductCatalogInventoryLedgerMovements(repo as any, searchStorage as any);

    await usecase.execute({
      page: 1,
      limit: 25,
      from: "2026-07-08",
      to: "2026-07-09",
    });

    expect(repo.listMovementsPaged).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date("2026-07-08T05:00:00.000Z"),
        toExclusive: new Date("2026-07-10T05:00:00.000Z"),
      }),
    );
  });

  it("maps warehouse, sku and direction filters to the kardex query", async () => {
    const repo = { listMovementsPaged: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    const searchStorage = { touchRecentSearch: jest.fn() };
    const usecase = new ListProductCatalogInventoryLedgerMovements(repo as any, searchStorage as any);

    await usecase.execute({
      filters: [
        { field: "warehouseId", operator: "IN", values: ["warehouse-a"] },
        { field: "sku", operator: "IN", values: ["sku-a"] },
        { field: "direction", operator: "IN", values: ["OUT"] },
      ] as any,
    });

    expect(repo.listMovementsPaged).toHaveBeenCalledWith(expect.objectContaining({
      warehouseIdsIn: ["warehouse-a"], skuIdsIn: ["sku-a"], directionIn: ["OUT"],
    }));
  });
});
