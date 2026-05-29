import { ListSaleOrderPaymentsUsecase } from "./list-payments.usecase";

describe("ListSaleOrderPaymentsUsecase", () => {
  it("lists payments for a saleOrderId", async () => {
    const paymentRepo = { listBySaleOrderIds: jest.fn().mockResolvedValue([{ id: "p1" }]) };
    const saleOrderRepo = { findById: jest.fn().mockResolvedValue({ id: "order-1" }) };
    const uc = new ListSaleOrderPaymentsUsecase(paymentRepo as any, saleOrderRepo as any);
    const result = await uc.execute({ saleOrderId: "order-1" });
    expect(paymentRepo.listBySaleOrderIds).toHaveBeenCalledWith(["order-1"]);
    expect(result).toEqual([{ id: "p1" }]);
  });
});
