import type { SelectQueryBuilder } from "typeorm";
import { normalizeIncomeFilters } from "src/modules/income/application/dtos/income-filter.input";
import { IncomeQueryTypeormRepository } from "./income-query.typeorm.repo";

describe("IncomeQueryTypeormRepository customer-credit filter", () => {
  it("applies company scope to pending orders without referencing an outer payment alias", async () => {
    const createQueryBuilder = () => {
      const query = {
        andWhere: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };
      return query;
    };
    const paymentQuery = createQueryBuilder();
    const orderQuery = createQueryBuilder();
    const repository = new IncomeQueryTypeormRepository(
      { createQueryBuilder: jest.fn().mockReturnValue(paymentQuery) } as any,
      { createQueryBuilder: jest.fn().mockReturnValue(orderQuery) } as any,
    );

    await repository.getSummary(normalizeIncomeFilters({ scopeCompanyId: "company-1" }));

    expect(orderQuery.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("scoped_payment.sale_order_id = so.id"),
      { incomeScopeCompanyId: "company-1" },
    );
    expect(orderQuery.andWhere.mock.calls[0][0]).not.toContain("sp.company_payment_account_id");
  });

  it("does not use an untyped nullable parameter for pending order scope", async () => {
    const createQueryBuilder = () => {
      const query = {
        andWhere: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };
      return query;
    };
    const paymentQuery = createQueryBuilder();
    const orderQuery = createQueryBuilder();
    const repository = new IncomeQueryTypeormRepository(
      { createQueryBuilder: jest.fn().mockReturnValue(paymentQuery) } as any,
      { createQueryBuilder: jest.fn().mockReturnValue(orderQuery) } as any,
    );

    await repository.getSummary(normalizeIncomeFilters({ scopeCompanyId: "company-1" }));

    expect(orderQuery.andWhere.mock.calls[0][0]).not.toContain(
      ":incomeScopeCompanyId IS NULL",
    );
  });

  it("applies company scope independently from per-user access", () => {
    const andWhere = jest.fn().mockReturnThis();
    const query = { andWhere } as unknown as SelectQueryBuilder<unknown>;
    const repository = new IncomeQueryTypeormRepository({} as any, {} as any);

    (repository as any).applyOrderFilters(query, normalizeIncomeFilters({ scopeCompanyId: "company-1" }));

    expect(andWhere).toHaveBeenCalledWith(expect.stringContaining("scoped_company_account.company_id"), { incomeScopeCompanyId: "company-1" });
  });

  it("adds a server-provided own-record scope to every order/payment query", () => {
    const andWhere = jest.fn().mockReturnThis();
    const query = { andWhere } as unknown as SelectQueryBuilder<unknown>;
    const repository = new IncomeQueryTypeormRepository({} as any, {} as any);

    (repository as any).applyOrderFilters(query, normalizeIncomeFilters({ scopeUserId: "user-123" }));

    expect(andWhere).toHaveBeenCalledTimes(1);
    expect(andWhere.mock.calls[0][0]).toContain("so.createdBy");
    expect(andWhere.mock.calls[0][0]).toContain("scoped_payment.created_by_user_id");
    expect(andWhere.mock.calls[0][1]).toEqual({ incomeScopeUserId: "user-123" });
  });

  it("filters only posted incomes by their net positive customer-credit ledger balance", () => {
    const andWhere = jest.fn().mockReturnThis();
    const query = { andWhere } as unknown as SelectQueryBuilder<unknown>;
    const repository = new IncomeQueryTypeormRepository({} as any, {} as any);

    (repository as any).applyFilters(query, normalizeIncomeFilters({
      filters: [{ field: "customerCreditStatus", operator: "in", values: ["HAS_BALANCE"] }],
    }));

    expect(andWhere).toHaveBeenCalledTimes(1);
    const [condition] = andWhere.mock.calls[0];
    expect(condition).toContain("sp.status = 'POSTED'");
    expect(condition).toContain("SUM(ccm.amount)");
    expect(condition).toContain("> 0");
  });

  it("excludes any net credit already consumed by later ledger movements", () => {
    const andWhere = jest.fn().mockReturnThis();
    const query = { andWhere } as unknown as SelectQueryBuilder<unknown>;
    const repository = new IncomeQueryTypeormRepository({} as any, {} as any);

    (repository as any).applyFilters(query, normalizeIncomeFilters({
      filters: [{ field: "customerCreditStatus", operator: "in", values: ["NO_BALANCE"] }],
    }));

    expect(andWhere.mock.calls[0][0]).toContain("SUM(ccm.amount)");
    expect(andWhere.mock.calls[0][0]).toContain("sp.status = 'POSTED'");
    expect(andWhere.mock.calls[0][0]).toContain("<= 0");
  });
});
