import { ListProductionOrders } from "./list-orders.usecase";

describe("ListProductionOrders", () => {
  const makeUseCase = (overrides?: { orderRepo?: any; searchStorage?: any }) => {
    const orderRepo = overrides?.orderRepo ?? {
      list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
      getItemSummariesByProductionIds: jest.fn().mockResolvedValue(new Map()),
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

  it("loads at most two SKU summaries for listed production orders", async () => {
    const order = { productionId: "production-1" };
    const summary = { total: 3, items: [{ name: "Jabon", attributeValue: "Curcuma" }] };
    const orderRepo = {
      list: jest.fn().mockResolvedValue({
        items: [{ order, createdByName: null, fromWarehouse: null, toWarehouse: null, serie: null }],
        total: 1,
        page: 1,
        limit: 10,
      }),
      getItemSummariesByProductionIds: jest.fn().mockResolvedValue(new Map([["production-1", summary]])),
    };
    const { useCase } = makeUseCase({ orderRepo });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(orderRepo.getItemSummariesByProductionIds).toHaveBeenCalledWith(["production-1"], 2);
    expect(result.items[0].itemSummary).toEqual(summary);
  });

  it("loads at most two SKU summaries for listed production orders", async () => {
    const order = { productionId: "production-1" };
    const summary = { total: 3, items: [{ name: "Jabon", attributeValue: "Curcuma" }] };
    const orderRepo = {
      list: jest.fn().mockResolvedValue({
        items: [{ order, createdByName: null, fromWarehouse: null, toWarehouse: null, serie: null }],
        total: 1,
        page: 1,
        limit: 10,
      }),
      getItemSummariesByProductionIds: jest.fn().mockResolvedValue(new Map([["production-1", summary]])),
    };
    const { useCase } = makeUseCase({ orderRepo });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(orderRepo.getItemSummariesByProductionIds).toHaveBeenCalledWith(["production-1"], 2);
    expect(result.items[0].itemSummary).toEqual(summary);
  });

  it("loads at most two SKU summaries for the listed production orders", async () => {
    const order = { productionId: "production-1" };
    const summary = { total: 3, items: [{ name: "Jabon", attributeValue: "Curcuma" }] };
    const orderRepo = {
      list: jest.fn().mockResolvedValue({
        items: [{ order, createdByName: null, fromWarehouse: null, toWarehouse: null, serie: null }],
        total: 1,
        page: 1,
        limit: 10,
      }),
      getItemSummariesByProductionIds: jest.fn().mockResolvedValue(new Map([["production-1", summary]])),
    };
    const { useCase } = makeUseCase({ orderRepo });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(orderRepo.getItemSummariesByProductionIds).toHaveBeenCalledWith(["production-1"], 2);
    expect(result.items[0].itemSummary).toEqual(summary);
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
