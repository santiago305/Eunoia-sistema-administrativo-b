import { Repository } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { AccountPayableEntity } from "../entities/account-payable.entity";
import { AccountPayableTypeormRepository } from "./account-payable.typeorm.repo";

describe("AccountPayableTypeormRepository", () => {
  const makeRow = (overrides?: Partial<AccountPayableEntity>) =>
    ({
      id: "11111111-1111-4111-8111-111111111111",
      purchaseId: "22222222-2222-4222-8222-222222222222",
      quotaId: null,
      supplierId: "33333333-3333-4333-8333-333333333333",
      description: "Factura de compra de julio",
      currency: CurrencyType.PEN,
      amountTotal: 750,
      amountPaid: 250,
      amountPending: 500,
      dueDate: new Date("2026-07-20T00:00:00.000Z"),
      status: "OVERDUE",
      createdByUserId: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      ...overrides,
    }) as AccountPayableEntity;

  const createQueryBuilder = (rows: AccountPayableEntity[] = [makeRow()]) => ({
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([rows, rows.length]),
  });

  const makeRepository = (qb = createQueryBuilder()) => {
    const baseRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<AccountPayableEntity>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(baseRepo),
    };
    (baseRepo as any).manager = manager;

    return { repo: new AccountPayableTypeormRepository(baseRepo), qb };
  };

  it("applies advanced filters and keeps server-side pagination", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      q: "factura julio",
      statuses: ["PENDING", "OVERDUE"],
      purchaseId: "22222222-2222-4222-8222-222222222222",
      supplierId: "33333333-3333-4333-8333-333333333333",
      currency: CurrencyType.PEN,
      dueFrom: "2026-07-01",
      dueTo: "2026-07-31",
      amountPendingMin: 100,
      amountPendingMax: 500,
      page: 3,
      limit: 25,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      "(ap.description ILIKE :q OR CAST(ap.purchaseId AS text) ILIKE :q)",
      { q: "%factura julio%" },
    );
    expect(qb.andWhere).toHaveBeenCalledWith("ap.status IN (:...statuses)", {
      statuses: ["PENDING", "OVERDUE"],
    });
    expect(qb.andWhere).toHaveBeenCalledWith("ap.purchaseId = :purchaseId", {
      purchaseId: "22222222-2222-4222-8222-222222222222",
    });
    expect(qb.andWhere).toHaveBeenCalledWith("ap.supplierId = :supplierId", {
      supplierId: "33333333-3333-4333-8333-333333333333",
    });
    expect(qb.andWhere).toHaveBeenCalledWith("ap.currency = :currency", { currency: CurrencyType.PEN });
    expect(qb.andWhere).toHaveBeenCalledWith("ap.dueDate >= :dueFrom", { dueFrom: "2026-07-01" });
    expect(qb.andWhere).toHaveBeenCalledWith("ap.dueDate <= :dueTo", { dueTo: "2026-07-31" });
    expect(qb.andWhere).toHaveBeenCalledWith("ap.amountPending >= :amountPendingMin", {
      amountPendingMin: 100,
    });
    expect(qb.andWhere).toHaveBeenCalledWith("ap.amountPending <= :amountPendingMax", {
      amountPendingMax: 500,
    });
    expect(qb.skip).toHaveBeenCalledWith(50);
    expect(qb.take).toHaveBeenCalledWith(25);
  });
});
