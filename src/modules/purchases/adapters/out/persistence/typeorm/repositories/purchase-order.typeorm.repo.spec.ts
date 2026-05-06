import { Repository } from "typeorm";
import { PurchaseOrderTypeormRepository } from "./purchase-order.typeorm.repo";
import { PurchaseOrderEntity } from "../entities/purchase-order.entity";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";

describe("PurchaseOrderTypeormRepository", () => {
  const makeRow = (overrides?: Partial<PurchaseOrderEntity>) =>
    ({
      id: "po-1",
      supplierId: "11111111-1111-1111-1111-111111111111",
      warehouseId: "22222222-2222-2222-2222-222222222222",
      documentType: VoucherDocType.FACTURA,
      serie: "F001",
      correlative: 123,
      currency: CurrencyType.PEN,
      paymentForm: PaymentFormType.CONTADO,
      creditDays: 0,
      numQuotas: 0,
      totalTaxed: 90,
      totalExempted: 0,
      totalIgv: 18,
      purchaseValue: 90,
      total: 108,
      note: null,
      status: PurchaseOrderStatus.DRAFT,
      isActive: true,
      expectedAt: new Date("2026-04-15T00:00:00.000Z"),
      dateIssue: new Date("2026-04-10T00:00:00.000Z"),
      dateExpiration: null,
      createdBy: "33333333-3333-3333-3333-333333333333",
      createdAt: new Date("2026-04-10T00:00:00.000Z"),
      ...overrides,
    }) as PurchaseOrderEntity;

  const createQueryBuilder = (rows: PurchaseOrderEntity[] = [makeRow()]) => {
    const clone = {
      getCount: jest.fn().mockResolvedValue(rows.length),
    };

    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnValue(clone),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: rows,
        raw: rows.map(() => ({
          supplier_name: "Ana",
          supplier_last_name: "Perez",
          supplier_trade_name: "Comercial Ana",
          supplier_document_number: "20123456789",
          warehouse_name: "Central",
          payment_total_paid: "10",
        })),
      }),
    };

    return { qb, clone };
  };

  const makeRepository = () => {
    const { qb } = createQueryBuilder();
    const baseRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<PurchaseOrderEntity>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(baseRepo),
    };
    (baseRepo as any).manager = manager;

    return { repo: new PurchaseOrderTypeormRepository(baseRepo), qb };
  };

  it("applies catalog filters for supplier, warehouse, status, documentType and paymentForm", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [
        { field: "supplierId", operator: "in", values: ["11111111-1111-1111-1111-111111111111"] },
        { field: "warehouseId", operator: "in", values: ["22222222-2222-2222-2222-222222222222"] },
        { field: "status", operator: "in", values: [PurchaseOrderStatus.DRAFT] },
        { field: "documentType", operator: "in", values: [VoucherDocType.FACTURA] },
        { field: "paymentForm", operator: "in", values: [PaymentFormType.CONTADO] },
      ],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      '"po"."document_type" IN (:...filter_0_values)',
      { filter_0_values: [VoucherDocType.FACTURA] },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      '"po"."supplier_id" IN (:...filter_1_values)',
      { filter_1_values: ["11111111-1111-1111-1111-111111111111"] },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      3,
      '"po"."warehouse_id" IN (:...filter_2_values)',
      { filter_2_values: ["22222222-2222-2222-2222-222222222222"] },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      4,
      '"po"."payment_form" IN (:...filter_3_values)',
      { filter_3_values: [PaymentFormType.CONTADO] },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      5,
      '"po"."status" IN (:...filter_4_values)',
      { filter_4_values: [PurchaseOrderStatus.DRAFT] },
    );
  });

  it("applies number, numeric and waitTime filters", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [
        { field: "number", operator: "contains", value: "F001-123" },
        { field: "total", operator: "gte", value: "100" },
        { field: "totalPaid", operator: "gt", value: "50" },
        { field: "totalToPay", operator: "lte", value: "60" },
        { field: "waitTime", operator: "in", values: ["IN_PROGRESS"] },
      ],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      `concat(coalesce("po"."serie", ''), '-', coalesce("po"."correlative"::text, '')) ILIKE :filter_0_value`,
      { filter_0_value: "%F001-123%" },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      '"po"."total" >= :filter_1_value',
      { filter_1_value: 100 },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      3,
      "COALESCE(payment_summary.total_paid, 0) > :filter_2_value",
      { filter_2_value: 50 },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      4,
      '("po"."total" - COALESCE(payment_summary.total_paid, 0)) <= :filter_3_value',
      { filter_3_value: 60 },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      5,
      '"po"."status" IN (:...filter_4_values)',
      {
        filter_4_values: [
          PurchaseOrderStatus.SENT,
          PurchaseOrderStatus.PARTIAL,
          PurchaseOrderStatus.PENDING_RECEIPT_CONFIRMATION,
        ],
      },
    );
  });

  it("applies date filters using DATE() truncation semantics", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [
        { field: "dateIssue", operator: "after", value: "2026-04-10T15:30:00" },
        { field: "expectedAt", operator: "between", range: { start: "2026-04-12", end: "2026-04-15" } },
      ],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      'DATE("po"."date_issue") > :filter_0_value',
      { filter_0_value: "2026-04-10" },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      'DATE("po"."expected_at") BETWEEN :filter_1_start AND :filter_1_end',
      { filter_1_start: "2026-04-12", filter_1_end: "2026-04-15" },
    );
  });
});
