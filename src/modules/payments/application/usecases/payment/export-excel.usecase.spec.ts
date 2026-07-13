import { BadRequestException } from "@nestjs/common";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { ExportPaymentsExcelUsecase } from "./export-excel.usecase";

describe("ExportPaymentsExcelUsecase", () => {
  const payment = PaymentDocument.create({
    payDocId: "payment-1",
    method: "Transferencia",
    date: new Date("2026-07-13T10:00:00.000Z"),
    currency: CurrencyType.PEN,
    amount: 120,
    fromDocumentType: PayDocType.PURCHASE,
    poId: "purchase-1",
    status: "APPROVED",
    companyPaymentAccountMaskedLabel: "BCP **** 1234",
    paymentEvidenceFileId: "evidence-1",
  });

  it("exports selected columns using current payment filters", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [payment], total: 1 }),
    };
    const usecase = new ExportPaymentsExcelUsecase(repo as any);

    const result = await usecase.execute({
      columns: [
        { key: "status", label: "Estado" },
        { key: "amount", label: "Monto" },
      ],
      q: "bcp",
      filters: [
        { field: "status", operator: "in", values: ["APPROVED"] },
        { field: "hasEvidence", operator: "in", values: ["true"] },
      ],
    });

    expect(repo.list).toHaveBeenCalledWith({
      q: "bcp",
      statuses: ["APPROVED"],
      hasEvidence: true,
      page: 1,
      limit: 20000,
    });
    expect(result.filename).toMatch(/^pagos-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(Buffer.isBuffer(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("rejects exports without valid columns", async () => {
    const usecase = new ExportPaymentsExcelUsecase({ list: jest.fn() } as any);

    await expect(usecase.execute({ columns: [{ key: "unknown", label: "No existe" }] }))
      .rejects
      .toBeInstanceOf(BadRequestException);
  });
});
