import { BadRequestException, ConflictException } from "@nestjs/common";
import { VoidSaleOrderPaymentUsecase } from "./void-payment.usecase";

describe("VoidSaleOrderPaymentUsecase", () => {
  const usecase = new VoidSaleOrderPaymentUsecase();
  const input = { saleOrderId: "order-1", paymentId: "payment-1", executedBy: "user-1", reason: "Pago duplicado" };

  it("retires the legacy endpoint so it cannot change a payment without ledger movements", async () => {
    await expect(usecase.execute(input)).rejects.toMatchObject({
      response: expect.objectContaining({ code: "FINANCIAL_ENDPOINT_RETIRED" }),
    });
  });

  it("keeps reason validation before returning the retired-route response", async () => {
    await expect(usecase.execute({ ...input, reason: "no" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(usecase.execute({ ...input, reason: "x".repeat(501) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reports the retired route as a conflict", async () => {
    try {
      await usecase.execute(input);
      throw new Error("expected conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
    }
  });
});
