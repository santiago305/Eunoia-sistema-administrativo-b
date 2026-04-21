import { ListWarehousesUsecase } from "./list.usecase";

describe("ListWarehousesUsecase", () => {
  const makeUseCase = (overrides?: {
    warehouseRepo?: any;
    searchStorage?: any;
  }) => {
    const warehouseRepo = overrides?.warehouseRepo ?? {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const searchStorage = overrides?.searchStorage ?? {
      touchRecentSearch: jest.fn().mockResolvedValue(undefined),
    };

    return {
      useCase: new ListWarehousesUsecase(warehouseRepo, searchStorage),
      warehouseRepo,
      searchStorage,
    };
  };

  it("does not persist recent search when there are no criteria", async () => {
    const { useCase, searchStorage } = makeUseCase();

    await useCase.execute({ requestedBy: "user-1", page: 1, limit: 10 });

    expect(searchStorage.touchRecentSearch).not.toHaveBeenCalled();
  });

  it("persists recent search when q or filters are present", async () => {
    const { useCase, warehouseRepo, searchStorage } = makeUseCase();

    await useCase.execute({
      requestedBy: "user-1",
      filters: [{ field: "department", operator: "in", values: ["Lima"] }],
      page: 1,
      limit: 10,
    });

    expect(warehouseRepo.list).toHaveBeenCalledWith({
      filters: [{ field: "department", operator: "in", mode: "include", values: ["Lima"] }],
      q: undefined,
      page: 1,
      limit: 10,
    });
    expect(searchStorage.touchRecentSearch).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "warehouses",
      snapshot: {
        q: undefined,
        filters: [{ field: "department", operator: "in", mode: "include", values: ["Lima"] }],
      },
    });
  });
});
