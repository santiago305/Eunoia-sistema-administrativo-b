import { GenerateSaleOrderPdfUseCase } from "./generate-sale-order-pdf.usecase";

describe("GenerateSaleOrderPdfUseCase payment totals", () => {
  it("uses only posted payments and sums them in integer cents", async () => {
    const renderSaleOrder = jest.fn().mockResolvedValue(Buffer.from("pdf"));
    const usecase = new GenerateSaleOrderPdfUseCase(
      { findOne: jest.fn().mockResolvedValue({
        id: "order-1",
        clientId: "client-1",
        warehouseId: "warehouse-1",
        total: 0.3,
        subTotal: 0.3,
        deliveryCost: 0,
        isActive: true,
      }) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([
        { amount: 0.1, status: "POSTED", method: "Transferencia", date: new Date("2026-10-01") },
        { amount: 0.2, status: "POSTED", method: "Transferencia", date: new Date("2026-10-01") },
        { amount: 50, status: "PENDING_CONFIRMATION", method: "Transferencia", date: new Date("2026-10-01") },
        { amount: 50, status: "REVERSED", method: "Transferencia", date: new Date("2026-10-01") },
        { amount: 50, method: "Transferencia", date: new Date("2026-10-01") },
      ]) } as any,
      { findOne: jest.fn().mockResolvedValue({ id: "client-1", fullName: "Cliente" }) } as any,
      { findOne: jest.fn().mockResolvedValue({ id: "warehouse-1", name: "Almacén" }) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      { findSingle: jest.fn().mockResolvedValue({ name: "Empresa" }) } as any,
      { renderSaleOrder } as any,
    );

    const result = await usecase.execute({ saleOrderId: "order-1" });

    expect(result).toEqual(Buffer.from("pdf"));
    expect(renderSaleOrder).toHaveBeenCalledWith(expect.objectContaining({
      totals: expect.objectContaining({
        total: 0.3,
        totalPaid: 0.3,
        pendingAmount: 0,
      }),
    }));
  });
});
