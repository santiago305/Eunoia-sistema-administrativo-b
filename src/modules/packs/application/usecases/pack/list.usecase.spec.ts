import { ListPacksUsecase } from "./list.usecase";

describe("ListPacksUsecase", () => {
  it("touches recent search when there is criteria and requestedBy", async () => {
    const packRepo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    } as any;

    const searchStorage = {
      touchRecentSearch: jest.fn().mockResolvedValue(undefined),
    } as any;

    const usecase = new ListPacksUsecase(packRepo, searchStorage);

    await usecase.execute({
      requestedBy: "user-1",
      q: "combo",
      filters: [{ field: "isActive", operator: "in", values: ["true"] }],
      page: 1,
      limit: 10,
    } as any);

    expect(searchStorage.touchRecentSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tableKey: "packs",
        snapshot: expect.objectContaining({
          q: "combo",
        }),
      }),
    );
  });
});
