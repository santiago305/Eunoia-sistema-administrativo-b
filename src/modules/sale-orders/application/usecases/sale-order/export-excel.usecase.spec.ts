import { BadRequestException } from "@nestjs/common";
import ExcelJS from "exceljs";
import { ExportSaleOrdersExcelUsecase } from "./export-excel.usecase";
import { SaleOrderSearchFields, SaleOrderSearchOperators } from "../../dtos/sale-order-search/sale-order-search-snapshot";

describe("ExportSaleOrdersExcelUsecase", () => {
  const saleOrderRepo = {
    list: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    saleOrderRepo.list.mockResolvedValue({
      total: 1,
      items: [
        {
          id: "order-1",
          serie: "SO",
          correlative: 1,
          client: { fullName: "Cliente Prueba", docNumber: "12345678" },
          warehouse: { name: "Principal" },
          source: { name: "Meta" },
          workflow: { name: "Venta" },
          currentState: { name: "Pendiente" },
          scheduleDate: "2026-07-10",
          deliveryDate: "2026-07-11",
          createdAt: "2026-07-09T10:00:00.000Z",
          subTotal: 100,
          deliveryCost: 10,
          discount: 5,
          total: 105,
          totalPaid: 50,
          pendingAmount: 55,
          assignedBy: { name: "Asesor Uno", email: "asesor@example.com" },
          createdBy: { name: "Creador Uno", email: "creador@example.com" },
          note: "nota",
          observation: "obs",
        },
      ],
    });
  });

  it("exports selected columns with sanitized filters", async () => {
    const usecase = new ExportSaleOrdersExcelUsecase(saleOrderRepo as any);

    const result = await usecase.execute({
      columns: [{ key: "number", label: "Numero" }],
      q: " SO ",
      filters: [
        {
          field: SaleOrderSearchFields.CREATED_AT,
          operator: SaleOrderSearchOperators.BETWEEN,
          range: { start: "2026-07-01", end: "2026-07-09" },
        },
      ],
      useDateRange: true,
    });

    expect(saleOrderRepo.list).toHaveBeenCalledWith({
      q: "SO",
      filters: [
        {
          field: SaleOrderSearchFields.CREATED_AT,
          operator: SaleOrderSearchOperators.BETWEEN,
          range: { start: "2026-07-01", end: "2026-07-09" },
        },
      ],
      page: 1,
      limit: 20000,
    });
    expect(result.filename).toMatch(/^pedidos-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(Buffer.isBuffer(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("removes toolbar date rules when date range export is disabled", async () => {
    const usecase = new ExportSaleOrdersExcelUsecase(saleOrderRepo as any);

    await usecase.execute({
      columns: [{ key: "number", label: "Numero" }],
      filters: [
        {
          field: SaleOrderSearchFields.CREATED_AT,
          operator: SaleOrderSearchOperators.BETWEEN,
          range: { start: "2026-07-01", end: "2026-07-09" },
        },
        {
          field: SaleOrderSearchFields.NUMBER,
          operator: SaleOrderSearchOperators.CONTAINS,
          value: "SO",
        },
      ],
      useDateRange: false,
    });

    expect(saleOrderRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [
          {
            field: SaleOrderSearchFields.NUMBER,
            operator: SaleOrderSearchOperators.CONTAINS,
            value: "SO",
          },
        ],
      }),
    );
  });

  it("exports Numero as text when it looks like a date", async () => {
    saleOrderRepo.list.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: "order-1",
          serie: "1958",
          correlative: "01",
        },
      ],
    });
    const usecase = new ExportSaleOrdersExcelUsecase(saleOrderRepo as any);

    const result = await usecase.execute({
      columns: [{ key: "number", label: "Numero" }],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.content);
    const worksheet = workbook.getWorksheet("Pedidos");
    const cell = worksheet?.getCell("A2");
    expect(cell?.value).toBe("1958-01");
    expect(cell?.numFmt).toBe("@");
  });

  it("exports SKUS and detail columns", async () => {
    saleOrderRepo.list.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: "order-1",
          serie: "P001",
          correlative: 12,
          SKUS: "EVA01863(1);EVA01893(1)",
          detail: "AMPOLLA1AZUFRE1",
        },
      ],
    });
    const usecase = new ExportSaleOrdersExcelUsecase(saleOrderRepo as any);

    const result = await usecase.execute({
      columns: [
        { key: "SKUS", label: "SKUS" },
        { key: "detail", label: "Detalle" },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.content);
    const worksheet = workbook.getWorksheet("Pedidos");

    expect(worksheet?.getCell("A1").value).toBe("SKUS");
    expect(worksheet?.getCell("B1").value).toBe("Detalle");
    expect(worksheet?.getCell("A2").value).toBe("EVA01863(1);EVA01893(1)");
    expect(worksheet?.getCell("B2").value).toBe("AMPOLLA1AZUFRE1");
  });

  it("exports lote column", async () => {
    saleOrderRepo.list.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: "order-1",
          lotes: 7,
        },
      ],
    });
    const usecase = new ExportSaleOrdersExcelUsecase(saleOrderRepo as any);

    const result = await usecase.execute({
      columns: [{ key: "lotes", label: "Lote" }],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.content);
    const worksheet = workbook.getWorksheet("Pedidos");

    expect(worksheet?.getCell("A1").value).toBe("Lote");
    expect(worksheet?.getCell("A2").value).toBe(7);
  });

  it("rejects empty or unknown column selections", async () => {
    const usecase = new ExportSaleOrdersExcelUsecase(saleOrderRepo as any);

    await expect(usecase.execute({ columns: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(usecase.execute({ columns: [{ key: "missing", label: "Missing" }] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
