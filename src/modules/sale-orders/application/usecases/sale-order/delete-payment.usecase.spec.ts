import { ConflictException, NotFoundException } from "@nestjs/common";
import { DeleteSaleOrderPaymentUsecase } from "./delete-payment.usecase";

describe("DeleteSaleOrderPaymentUsecase", () => {
  const make = (status: "PENDING_CONFIRMATION" | "POSTED" = "PENDING_CONFIRMATION", rows = true) => {
    const paymentRepo = { listBySaleOrderId: jest.fn().mockResolvedValue(rows ? [{ id: "p1", status }] : []) };
    const uow = { runInTransaction: (fn: any) => fn({}) };
    return { paymentRepo, usecase: new DeleteSaleOrderPaymentUsecase(uow as any, paymentRepo as any) };
  };

  it("requires the payment to belong to the order", async () => {
    const { usecase } = make("PENDING_CONFIRMATION", false);
    await expect(usecase.execute({ saleOrderId: "order-1", paymentId: "p1" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires cancelling a pending income instead of physically deleting it", async () => {
    const { usecase } = make();
    await expect(usecase.execute({ saleOrderId: "order-1", paymentId: "p1" })).rejects.toMatchObject({
      response: expect.objectContaining({ code: "FINANCIAL_HISTORY_IMMUTABLE" }),
    });
  });

  it("never physically deletes a posted income", async () => {
    const { usecase, paymentRepo } = make("POSTED");
    await expect(usecase.execute({ saleOrderId: "order-1", paymentId: "p1" })).rejects.toBeInstanceOf(ConflictException);
    expect(paymentRepo.listBySaleOrderId).toHaveBeenCalledWith("order-1", expect.anything());
  });
});
