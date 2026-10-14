import { BadRequestException } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { IncomeQueryRepository } from "../../domain/ports/income-query.repository";
import { IncomeOutput } from "../dtos/income.output";
import { ExportIncomeExcelUsecase } from "./export-income-excel.usecase";

const postedIncome = {
  incomeId: "income-1", saleOrderId: "order-1", saleOrderNumber: "PED-1", clientName: "Cliente",
  amount: 100, currency: "PEN", method: "Transferencia", paymentMethodId: null, paymentMethodCode: null,
  paymentMethodName: "Transferencia", companyPaymentAccountId: "account-1", companyPaymentAccountLabel: "Banco ****1234",
  operationNumber: "OP-1", detail: "Abono", date: "2026-10-12", paymentDate: "2026-10-12", createdAt: "2026-10-12T10:00:00Z",
  evidenceUrl: null, evidence: { available: true, status: "AVAILABLE", attachmentId: null, url: null, originalName: null, mimeType: null, sizeBytes: null, createdAt: null, canView: false, canUpload: false, inherited: false },
  status: "POSTED", correctedFromPaymentId: null, financialReason: null, postedAt: "2026-10-12T10:00:00Z", postedByUserId: "user-1",
  appliedAmount: 70, customerCreditBalance: 30, reconciledAmount: 50, reconciliationStatus: "PARTIALLY_RECONCILED",
  accountingDate: "2026-10-12", version: 2, createdByUserId: "user-1", updatedByUserId: null, voidedAt: null, voidedByUserId: null, voidReason: null,
} satisfies IncomeOutput;

describe("ExportIncomeExcelUsecase", () => {
  const repo = { list: jest.fn() } as unknown as jest.Mocked<IncomeQueryRepository>;
  let usecase: ExportIncomeExcelUsecase;

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new ExportIncomeExcelUsecase(repo);
    repo.list.mockResolvedValue({ items: [postedIncome], total: 1 });
  });

  it("exports selected canonical columns and reconciled/applied/credit amounts", async () => {
    const file = await usecase.execute({ columns: [
      { key: "amount" }, { key: "appliedAmount" }, { key: "customerCreditBalance" },
      { key: "financialStatus" }, { key: "reconciliationStatus" }, { key: "reconciledAmount" },
    ] });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.content);
    const sheet = workbook.getWorksheet("Ingresos");

    expect(sheet?.getRow(1).values).toEqual([undefined, "Importe recibido", "Importe aplicado", "Saldo a favor neto", "Estado financiero", "Estado de conciliación", "Importe conciliado"]);
    expect(sheet?.getRow(2).values).toEqual([undefined, 100, 70, 30, "Contabilizado", "Conciliación parcial", 50]);
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20_000 }));
  });

  it("rejects empty/unknown columns and exports larger than the safety limit", async () => {
    await expect(usecase.execute({ columns: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(usecase.execute({ columns: [{ key: "unknown" }] })).rejects.toBeInstanceOf(BadRequestException);
    repo.list.mockResolvedValue({ items: [], total: 20_001 });
    await expect(usecase.execute({ columns: [{ key: "amount" }] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
