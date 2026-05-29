import { AddSaleOrderPaymentUsecase } from "./add-payment.usecase";

describe("AddSaleOrderPaymentUsecase", () => {
  it("throws when order not found", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const paymentRepo = { bulkCreate: jest.fn() };
    const saleOrderRepo = { findByIdForUpdate: jest.fn().mockResolvedValue(null) };

    const uc = new AddSaleOrderPaymentUsecase(uow as any, paymentRepo as any, saleOrderRepo as any);

    await expect(
      uc.execute({ saleOrderId: "order-1", bankAccountId: "ba-1", method: "cash", amount: 10 }),
    ).rejects.toThrow("Pedido no encontrado");
  });

  it("throws when date is invalid", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const paymentRepo = { bulkCreate: jest.fn() };
    const saleOrderRepo = { findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1" }) };

    const uc = new AddSaleOrderPaymentUsecase(uow as any, paymentRepo as any, saleOrderRepo as any);

    await expect(
      uc.execute({
        saleOrderId: "order-1",
        bankAccountId: "ba-1",
        method: "cash",
        amount: 10,
        date: "not-a-date",
      }),
    ).rejects.toThrow("Fecha de pago inválida");
  });

  it("creates payment and returns paymentId", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const paymentRepo = { bulkCreate: jest.fn().mockResolvedValue([{ id: "p1" }]) };
    const saleOrderRepo = { findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1" }) };

    const uc = new AddSaleOrderPaymentUsecase(uow as any, paymentRepo as any, saleOrderRepo as any);

    const result = await uc.execute({
      saleOrderId: "order-1",
      bankAccountId: " ba-1 ",
      method: "cash",
      amount: 10,
    });

    expect(paymentRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          saleOrderId: "order-1",
          bankAccountId: "ba-1",
          method: "cash",
          amount: 10,
        }),
      ],
      expect.anything(),
    );
    expect(result).toEqual({ paymentId: "p1" });
  });

  it("throws when bankAccountId is invalid (FK)", async () => {
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const paymentRepo = {
      bulkCreate: jest.fn().mockRejectedValue(Object.assign(new Error("fk"), { code: "23503" })),
    };
    const saleOrderRepo = { findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1" }) };

    const uc = new AddSaleOrderPaymentUsecase(uow as any, paymentRepo as any, saleOrderRepo as any);

    await expect(
      uc.execute({ saleOrderId: "order-1", bankAccountId: "ba-1", method: "cash", amount: 10 }),
    ).rejects.toThrow("Cuenta bancaria inválida");
  });
});
