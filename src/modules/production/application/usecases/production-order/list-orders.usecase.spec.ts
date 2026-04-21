import { ListProductionOrders } from "./list-orders.usecase";

describe("ListProductionOrders", () => {
  const makeUseCase = (overrides?: { orderRepo?: any; searchStorage?: any }) => {
    const orderRepo = overrides?.orderRepo ?? {
      list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
    };
    const searchStorage = overrides?.searchStorage ?? {
      touchRecentSearch: jest.fn().mockResolvedValue(undefined),
    };

    return {
      useCase: new ListProductionOrders(orderRepo, searchStorage),
      orderRepo,
      searchStorage,
    };
  };

  it("does not persist recent search when there are no criteria", async () => {
    const { useCase, searchStorage } = makeUseCase();

    await useCase.execute({
      requestedBy: "user-1",
      page: 1,
      limit: 10,
    });

    expect(searchStorage.touchRecentSearch).not.toHaveBeenCalled();
  });

  it("persists recent search when q or filters are present", async () => {
    const { useCase, orderRepo, searchStorage } = makeUseCase();

    await useCase.execute({
      requestedBy: "user-1",
      q: "produccion",
      filters: [{ field: "status", operator: "in", values: ["DRAFT"] }],
      page: 1,
      limit: 10,
    });

    expect(orderRepo.list).toHaveBeenCalledWith({
      requestedBy: "user-1",
      q: "produccion",
      filters: [{ field: "status", operator: "in", mode: "include", values: ["DRAFT"] }],
      page: 1,
      limit: 10,
    });
    expect(searchStorage.touchRecentSearch).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "production-orders",
      snapshot: {
        q: "produccion",
        filters: [{ field: "status", operator: "in", mode: "include", values: ["DRAFT"] }],
      },
    });
  });
});
