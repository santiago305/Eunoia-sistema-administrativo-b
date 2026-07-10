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
});
