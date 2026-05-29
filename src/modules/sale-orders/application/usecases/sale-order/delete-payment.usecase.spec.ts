import { DeleteSaleOrderPaymentUsecase } from "./delete-payment.usecase";

describe("DeleteSaleOrderPaymentUsecase", () => {
  it("deletes payment when it belongs to saleOrderId", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const paymentRepo = { deleteById: jest.fn().mockResolvedValue(true) };
    const uc = new DeleteSaleOrderPaymentUsecase(uow as any, paymentRepo as any);

    const result = await uc.execute({ saleOrderId: "order-1", paymentId: "p1" });
    expect(paymentRepo.deleteById).toHaveBeenCalledWith(
      { saleOrderId: "order-1", paymentId: "p1" },
      expect.anything(),
    );
    expect(result).toEqual({ deleted: true });
  });

  it("throws when payment is not found", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const paymentRepo = { deleteById: jest.fn().mockResolvedValue(false) };
    const uc = new DeleteSaleOrderPaymentUsecase(uow as any, paymentRepo as any);

    await expect(uc.execute({ saleOrderId: "order-1", paymentId: "p1" })).rejects.toThrow("Pago no encontrado");
  });
});
