import { ListSuppliersUsecase } from "./list.usecase";

describe("ListSuppliersUsecase", () => {
  const makeUseCase = (overrides?: {
    supplierRepo?: any;
    searchStorage?: any;
  }) => {
    const supplierRepo = overrides?.supplierRepo ?? {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const searchStorage = overrides?.searchStorage ?? {
      touchRecentSearch: jest.fn().mockResolvedValue(undefined),
    };

    return {
      useCase: new ListSuppliersUsecase(supplierRepo, searchStorage),
      supplierRepo,
      searchStorage,
    };
  };

  it("does not persist recent search when there are no criteria", async () => {
    const { useCase, searchStorage } = makeUseCase();

    await useCase.execute({ requestedBy: "user-1", page: 1, limit: 10 });

    expect(searchStorage.touchRecentSearch).not.toHaveBeenCalled();
  });

  it("persists recent search when q or filters are present", async () => {
    const { useCase, supplierRepo, searchStorage } = makeUseCase();

    await useCase.execute({
      requestedBy: "user-1",
      q: "ana",
      filters: [],
      page: 1,
      limit: 10,
    });

    expect(supplierRepo.list).toHaveBeenCalledWith({
      filters: [],
      q: "ana",
      page: 1,
      limit: 10,
    });
    expect(searchStorage.touchRecentSearch).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "suppliers",
      snapshot: {
        q: "ana",
        filters: [],
      },
    });
  });
});
