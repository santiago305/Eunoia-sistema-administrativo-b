import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { CancelSaleOrderUsecase } from "./cancel.usecase";

describe("CancelSaleOrderUsecase", () => {
  it.each([
    [0, ClientType.LAGGING],
    [1, ClientType.NEW],
    [2, ClientType.REPURCHASE],
  ])("classifies %s completed orders as %s after cancellation", async (count, expectedType) => {
    const tx = {};
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "order-1",
        clientId: "client-1",
        createdBy: "user-1",
      }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(count),
    };
    const clientRepo = { update: jest.fn() };
    const transitionService = {
      advance: jest.fn().mockResolvedValue({
        order: { id: "order-1", currentStateId: "cancelled" },
        warnings: [],
        actionOutcomes: [],
      }),
    };
    const usecase = new CancelSaleOrderUsecase(
      { runInTransaction: (work: any) => work(tx) } as any,
      saleOrderRepo as any,
      clientRepo as any,
      transitionService as any,
    );

    await expect(usecase.execute({ saleOrderId: "order-1" })).resolves.toEqual({
      saleOrderId: "order-1",
      currentStateId: "cancelled",
    });
    expect(transitionService.advance).toHaveBeenCalledWith(
      expect.objectContaining({ saleOrderId: "order-1", transitionPurpose: "CANCEL" }),
      tx,
    );
    expect(clientRepo.update).toHaveBeenCalledWith(
      { clientId: "client-1", type: expectedType },
      tx,
    );
  });
});
