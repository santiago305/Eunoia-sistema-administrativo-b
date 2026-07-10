import { ListProductCatalogInventoryDocuments } from "./list-inventory-documents.usecase";

describe("ListProductCatalogInventoryDocuments", () => {
  it("converts date-only range to full America/Lima days", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 }),
    };
    const searchStorage = {
      touchRecentSearch: jest.fn(),
    };
    const usecase = new ListProductCatalogInventoryDocuments(repo as any, searchStorage as any);

    await usecase.execute({
      page: 1,
      limit: 25,
      from: "2026-07-08",
      to: "2026-07-09",
    });

    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date("2026-07-08T05:00:00.000Z"),
        toExclusive: new Date("2026-07-10T05:00:00.000Z"),
      }),
    );
  });
});
