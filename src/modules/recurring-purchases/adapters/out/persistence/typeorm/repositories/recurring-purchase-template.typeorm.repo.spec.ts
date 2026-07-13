import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { RecurringPurchaseTemplateTypeormRepository } from "./recurring-purchase-template.typeorm.repo";

const makeRow = () =>
  ({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    supplierId: "11111111-1111-4111-8111-111111111111",
    name: "Hosting mensual",
    description: null,
    frequency: "MONTHLY",
    purchaseType: PurchaseType.SUBSCRIPTION,
    currency: "PEN",
    amount: "120.00",
    startDate: "2026-06-10",
    nextDueDate: "2026-07-10",
    billingAnchorDay: 10,
    status: "ACTIVE",
    reminderDaysBefore: [7, 3, 1, 0],
    createdByUserId: null,
    lastGeneratedAt: null,
    lastGeneratedPeriodKey: null,
    lastGeneratedPurchaseId: null,
    lastGeneratedAccountPayableId: null,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-10T00:00:00.000Z"),
  }) as any;

const createQueryBuilder = (rows = [makeRow()]) => {
  const qb = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(async () => [rows, rows.length]),
    getMany: jest.fn(async () => rows),
  };
  return qb;
};

describe("RecurringPurchaseTemplateTypeormRepository", () => {
  it("finds active templates due inside the reminder window range", async () => {
    const qb = createQueryBuilder();
    const ormRepo = {
      manager: {
        getRepository: jest.fn(() => ormRepo),
      },
      createQueryBuilder: jest.fn(() => qb),
    };
    const repository = new RecurringPurchaseTemplateTypeormRepository(ormRepo as any);

    const result = await repository.findDueForReminderWindows(
      new Date("2026-07-03T08:00:00.000Z"),
      [7, 3, 1, 0],
    );

    expect(ormRepo.createQueryBuilder).toHaveBeenCalledWith("template");
    expect(qb.where).toHaveBeenCalledWith("template.status = :status", { status: "ACTIVE" });
    expect(qb.andWhere).toHaveBeenCalledWith("template.next_due_date BETWEEN :today AND :maxDueDate", {
      today: "2026-07-03",
      maxDueDate: "2026-07-10",
    });
    expect(qb.orderBy).toHaveBeenCalledWith("template.nextDueDate", "ASC");
    expect(result).toHaveLength(1);
    expect(result[0].recurringPurchaseTemplateId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("applies smart filters, search text and defaults pagination to 25", async () => {
    const qb = createQueryBuilder();
    const ormRepo = {
      manager: {
        getRepository: jest.fn(() => ormRepo),
      },
      createQueryBuilder: jest.fn(() => qb),
    };
    const repository = new RecurringPurchaseTemplateTypeormRepository(ormRepo as any);

    const result = await repository.list({
      q: "hosting",
      filters: [
        {
          field: "supplierId",
          operator: "in",
          values: ["11111111-1111-4111-8111-111111111111"],
        },
        {
          field: "nextDueDate",
          operator: "between",
          range: { start: "2026-07-01", end: "2026-07-31" },
        },
        {
          field: "amount",
          operator: "gte",
          value: "100",
        },
        {
          field: "paymentStatus",
          operator: "in",
          values: ["PENDING", "PARTIAL"],
        },
      ],
    });

    expect(qb.leftJoin).toHaveBeenCalledWith(
      "accounts_payable",
      "payable",
      "payable.account_payable_id = template.last_generated_account_payable_id",
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("template.supplier_id"),
      expect.objectContaining({ filter_0_values: ["11111111-1111-4111-8111-111111111111"] }),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("template.next_due_date BETWEEN"),
      expect.objectContaining({ filter_1_start: "2026-07-01", filter_1_end: "2026-07-31" }),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("template.amount >="),
      expect.objectContaining({ filter_2_value: 100 }),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("payable.status"),
      expect.objectContaining({ filter_3_values: ["PENDING", "PARTIAL"] }),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("template.name ILIKE"),
      expect.objectContaining({ q: "%hosting%" }),
    );
    expect(qb.orderBy).toHaveBeenCalledWith("template.nextDueDate", "ASC");
    expect(qb.addOrderBy).toHaveBeenCalledWith("template.createdAt", "DESC");
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(25);
    expect(result.limit).toBe(25);
  });
});
