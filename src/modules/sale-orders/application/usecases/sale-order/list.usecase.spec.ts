import { ListSaleOrdersUsecase } from "./list.usecase";

describe("ListSaleOrdersUsecase", () => {
  it("touches recent search when requestedBy and criteria", async () => {
    const saleOrderRepo = {
      list: jest.fn().mockResolvedValue({
        items: [],
        total: 1,
      }),
    };

    const saleOrderSearchRepo = { touchRecentSearch: jest.fn() };

    const uc = new ListSaleOrdersUsecase(saleOrderRepo as any, saleOrderSearchRepo as any);
    await uc.execute({ q: "S01", page: 1, limit: 10, requestedBy: "user-1" });

    expect(saleOrderSearchRepo.touchRecentSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tableKey: "sale-orders",
        snapshot: expect.objectContaining({ q: "S01" }),
      }),
    );
  });

  it("does not touch recent search when there is no criteria", async () => {
    const saleOrderRepo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const saleOrderSearchRepo = { touchRecentSearch: jest.fn() };

    const uc = new ListSaleOrdersUsecase(saleOrderRepo as any, saleOrderSearchRepo as any);
    await uc.execute({ requestedBy: "user-1" });

    expect(saleOrderSearchRepo.touchRecentSearch).not.toHaveBeenCalled();
  });

  it("returns repo results and pagination", async () => {
    const saleOrderRepo = {
      list: jest.fn().mockResolvedValue({
        items: [
          {
            id: "order-1",
            serie: "S01",
            correlative: 10,
            warehouse: null,
            client: null,
            agencyDetail: null,
            source: null,
            scheduleDate: null,
            deliveryDate: null,
            deliveryType: null,
            subTotal: 0,
            deliveryCost: 0,
            total: 100,
            note: null,
            createdBy: null,
            agendaStatus: "COORDINATED",
            deliveryStatus: null,
            isActive: true,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: null,
            items: [],
            payments: [],
            totalPaid: 0,
            pendingAmount: 100,
            paymentStatus: "PENDING",
          },
        ],
        total: 1,
      }),
    };
    const saleOrderSearchRepo = { touchRecentSearch: jest.fn() };

    const uc = new ListSaleOrdersUsecase(saleOrderRepo as any, saleOrderSearchRepo as any);
    const result = await uc.execute({ page: 2, limit: 20 });

    expect(result).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        total: 1,
        page: 2,
        limit: 20,
      }),
    );
  });
});
