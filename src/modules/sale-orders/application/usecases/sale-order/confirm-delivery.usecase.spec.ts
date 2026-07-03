import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { ConfirmSaleOrderDeliveryUsecase } from "./confirm-delivery.usecase";

describe("ConfirmSaleOrderDeliveryUsecase", () => {
  it("delegates stock consumption to the configured workflow transition", async () => {
    const tx = {};
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "order-1",
        clientId: "client-1",
        createdBy: "user-1",
      }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
    };
    const clientRepo = { update: jest.fn() };
    const transitionService = {
      advance: jest.fn().mockResolvedValue({
        order: { id: "order-1", currentStateId: "delivered" },
        warnings: [],
        actionOutcomes: [],
      }),
    };
    const usecase = new ConfirmSaleOrderDeliveryUsecase(
      { runInTransaction: (work: any) => work(tx) } as any,
      saleOrderRepo as any,
      clientRepo as any,
      transitionService as any,
    );

    await expect(usecase.execute({ saleOrderId: "order-1" })).resolves.toEqual({
      saleOrderId: "order-1",
      currentStateId: "delivered",
    });
    expect(transitionService.advance).toHaveBeenCalledWith(
      expect.objectContaining({ saleOrderId: "order-1", transitionCode: "CONFIRM_DELIVERY" }),
      tx,
    );
    expect(clientRepo.update).toHaveBeenCalledWith(
      { clientId: "client-1", type: ClientType.NEW },
      tx,
    );
  });
});
