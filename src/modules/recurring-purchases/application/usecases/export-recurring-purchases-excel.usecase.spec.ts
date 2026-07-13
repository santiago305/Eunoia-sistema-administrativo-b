import { BadRequestException } from "@nestjs/common";
import { ExportRecurringPurchasesExcelUsecase } from "./export-recurring-purchases-excel.usecase";

describe("ExportRecurringPurchasesExcelUsecase", () => {
  const repo = {
    list: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo.list.mockResolvedValue({
      items: [
        {
          recurringPurchaseTemplateId: "rec-1",
          supplierId: "supplier-1",
          name: "Hosting mensual",
          description: "Servidor",
          frequency: "MONTHLY",
          purchaseType: "SUBSCRIPTION",
          currency: "PEN",
          amount: 150,
          startDate: new Date("2026-07-01T00:00:00.000Z"),
          nextDueDate: new Date("2026-08-01T00:00:00.000Z"),
          billingAnchorDay: 1,
          status: "ACTIVE",
          reminderDaysBefore: [7, 3, 1, 0],
          lastGeneratedPeriodKey: "2026-07",
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          updatedAt: new Date("2026-07-02T00:00:00.000Z"),
        },
      ],
      total: 1,
      page: 1,
      limit: 20000,
    });
  });

  it("lists available recurring purchase export columns", () => {
    const usecase = new ExportRecurringPurchasesExcelUsecase(repo as any);

    expect(usecase.getAvailableColumns()).toEqual(
      expect.arrayContaining([
        { key: "name", label: "Nombre" },
        { key: "frequency", label: "Frecuencia" },
        { key: "amount", label: "Importe" },
        { key: "nextDueDate", label: "Proximo vencimiento" },
      ]),
    );
  });

  it("exports selected columns using recurring purchase filters", async () => {
    const usecase = new ExportRecurringPurchasesExcelUsecase(repo as any);

    const file = await usecase.execute({
      columns: [{ key: "name", label: "Nombre" }],
      q: "hosting",
      filters: [{ field: "status", operator: "in", values: ["ACTIVE"] }],
    });

    expect(repo.list).toHaveBeenCalledWith({
      q: "hosting",
      filters: [{ field: "status", operator: "in", mode: "include", values: ["ACTIVE"] }],
      page: 1,
      limit: 20000,
    });
    expect(file.filename).toMatch(/^compras-recurrentes-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(Buffer.isBuffer(file.content)).toBe(true);
  });

  it("rejects export without selected columns", async () => {
    const usecase = new ExportRecurringPurchasesExcelUsecase(repo as any);

    await expect(usecase.execute({ columns: [] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
