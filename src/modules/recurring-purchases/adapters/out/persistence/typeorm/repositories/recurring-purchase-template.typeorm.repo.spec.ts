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
    startDate: new Date("2026-06-10T00:00:00.000Z"),
    nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
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
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
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
    expect(qb.andWhere).toHaveBeenCalledWith("template.nextDueDate BETWEEN :today AND :maxDueDate", {
      today: "2026-07-03",
      maxDueDate: "2026-07-10",
    });
    expect(qb.orderBy).toHaveBeenCalledWith("template.nextDueDate", "ASC");
    expect(result).toHaveLength(1);
    expect(result[0].recurringPurchaseTemplateId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
