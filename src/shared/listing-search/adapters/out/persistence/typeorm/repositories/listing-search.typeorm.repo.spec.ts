import { ListingSearchTypeormRepository } from "./listing-search.typeorm.repo";

describe("ListingSearchTypeormRepository", () => {
  it("touches recent searches with an atomic upsert to tolerate duplicate concurrent requests", async () => {
    const recentRepo = {
      upsert: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      remove: jest.fn(),
    };
    const repository = new ListingSearchTypeormRepository(recentRepo as any, {} as any);

    await repository.touchRecentSearch({
      userId: "11111111-1111-4111-8111-111111111111",
      tableKey: "warehouses",
      snapshot: { q: "", filters: [{ field: "isActive", operator: "equals", values: ["true"] }] },
    });

    expect(recentRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "11111111-1111-4111-8111-111111111111",
        tableKey: "warehouses",
        snapshot: { q: "", filters: [{ field: "isActive", operator: "equals", values: ["true"] }] },
        lastUsedAt: expect.any(Date),
        snapshotHash: expect.any(String),
      }),
      {
        conflictPaths: ["userId", "tableKey", "snapshotHash"],
        skipUpdateIfNoValuesChanged: true,
      },
    );
  });
});
