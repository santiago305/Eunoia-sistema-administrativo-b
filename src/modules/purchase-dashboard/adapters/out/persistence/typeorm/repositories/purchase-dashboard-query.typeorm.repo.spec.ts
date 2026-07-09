import { PurchaseDashboardQueryTypeormRepository } from "./purchase-dashboard-query.typeorm.repo";

describe("PurchaseDashboardQueryTypeormRepository", () => {
  const makeQueryBuilder = (rawMany: unknown[] = [], rawOne: unknown = {}) => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rawMany),
      getRawOne: jest.fn().mockResolvedValue(rawOne),
    };
    return qb;
  };

  const makeRepository = (builders: Record<string, any>) => {
    const purchaseRepo = { createQueryBuilder: jest.fn().mockReturnValue(builders.purchase ?? makeQueryBuilder()) };
    const paymentRepo = { createQueryBuilder: jest.fn().mockReturnValue(builders.payment ?? makeQueryBuilder()) };
    const payableRepo = { createQueryBuilder: jest.fn().mockReturnValue(builders.payable ?? makeQueryBuilder()) };
    const itemRepo = { createQueryBuilder: jest.fn().mockReturnValue(builders.item ?? makeQueryBuilder()) };

    return {
      repo: new PurchaseDashboardQueryTypeormRepository(
        purchaseRepo as any,
        paymentRepo as any,
        payableRepo as any,
        itemRepo as any,
      ),
      purchaseRepo,
      paymentRepo,
      payableRepo,
      itemRepo,
    };
  };

  it("uses issue date first and created date fallback for purchase date filters", async () => {
    const qb = makeQueryBuilder([{ label: "INVENTORY", value: "100", count: "1" }]);
    const { repo } = makeRepository({ purchase: qb });

    await repo.getByType({
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-07-31T23:59:59.999Z"),
    });

    expect(qb.andWhere).toHaveBeenCalledWith("COALESCE(po.dateIssue, po.createdAt) >= :from", {
      from: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(qb.andWhere).toHaveBeenCalledWith("COALESCE(po.dateIssue, po.createdAt) <= :to", {
      to: new Date("2026-07-31T23:59:59.999Z"),
    });
  });

  it("keeps payment document filters out of upcoming account payable rows", async () => {
    const qb = makeQueryBuilder([]);
    const { repo } = makeRepository({ payable: qb });

    await repo.getUpcomingPayments({
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
    });

    const whereClauses = qb.andWhere.mock.calls.map(([sql]: [string]) => sql).join("\n");
    expect(whereClauses).toContain("ap.amountPending > 0");
    expect(whereClauses).toContain("ap.status IN (:...statuses)");
    expect(whereClauses).toContain("ap.dueDate IS NULL OR ap.dueDate >= :today");
    expect(whereClauses).not.toContain("paymentMethodId");
    expect(whereClauses).not.toContain("companyPaymentAccountId");
  });

  it("resolves top item labels from catalog names before falling back to ids", async () => {
    const qb = makeQueryBuilder([
      { itemId: "stock-item-1", label: "Jabón", itemType: "RAW_MATERIAL", total: "10", quantity: "2" },
    ]);
    const { repo } = makeRepository({ item: qb });

    await repo.getTopItems({});

    expect(qb.leftJoin).toHaveBeenCalledWith("pc_stock_items", "psi", "psi.stock_item_id = item.stockItemId");
    expect(qb.leftJoin).toHaveBeenCalledWith("pc_skus", "sku", "sku.sku_id = psi.sku_id");
    expect(qb.leftJoin).toHaveBeenCalledWith("pc_products", "product", "product.product_id = sku.product_id");
    expect(qb.select).toHaveBeenCalledWith(
      "COALESCE(item.stockItemId, item.internalMaterialId, item.assetCategoryId)::text",
      "itemId",
    );
    expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining("NULLIF(sku.name, '')"), "label");
    expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining("NULLIF(product.name, '')"), "label");
  });

  it("keeps active internal versus inventory labels", async () => {
    const qb = makeQueryBuilder([{ label: "Interno", value: "30", count: "1" }]);
    const { repo } = makeRepository({ purchase: qb });

    await repo.getInternalVsInventory({});

    expect(qb.select).toHaveBeenCalledWith(expect.stringContaining("THEN 'Inventario'"), "label");
    expect(qb.select).toHaveBeenCalledWith(expect.stringContaining("THEN 'Activo'"), "label");
    expect(qb.select).toHaveBeenCalledWith(expect.stringContaining("THEN 'Interno'"), "label");
    expect(qb.select).toHaveBeenCalledWith(expect.stringContaining("ELSE 'Servicio'"), "label");
  });
});
