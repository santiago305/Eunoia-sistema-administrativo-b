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

  it("returns only payment ids allowed by the requester's income scope", async () => {
    const paymentRepo = { listBySaleOrderIds: jest.fn().mockResolvedValue([{ id: "visible" }, { id: "hidden" }]) };
    const saleOrderRepo = { findById: jest.fn().mockResolvedValue({ id: "order-1", payments: [{ id: "visible" }] }) };
    const accessPolicy = { resolveReadContext: jest.fn().mockResolvedValue({ includeIncomePayments: true }) };
    const uc = new ListSaleOrderPaymentsUsecase(paymentRepo as any, saleOrderRepo as any, accessPolicy as any);

    await expect(uc.execute({ saleOrderId: "order-1", requestedBy: "user-1" })).resolves.toEqual([{ id: "visible" }]);
    expect(saleOrderRepo.findById).toHaveBeenCalledWith("order-1", { includeIncomePayments: true });
  });

  it("returns no payments when the requester has no income permission", async () => {
    const paymentRepo = { listBySaleOrderIds: jest.fn().mockResolvedValue([{ id: "p1" }]) };
    const saleOrderRepo = { findById: jest.fn().mockResolvedValue({ id: "order-1", payments: [] }) };
    const accessPolicy = { resolveReadContext: jest.fn().mockResolvedValue({ includeIncomePayments: false }) };
    const uc = new ListSaleOrderPaymentsUsecase(paymentRepo as any, saleOrderRepo as any, accessPolicy as any);

    await expect(uc.execute({ saleOrderId: "order-1", requestedBy: "user-1" })).resolves.toEqual([]);
  });
});
