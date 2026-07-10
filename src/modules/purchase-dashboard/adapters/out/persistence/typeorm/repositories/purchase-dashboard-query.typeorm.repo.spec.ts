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

  it("applies payable filters through purchases without payment document fields", async () => {
    const qb = makeQueryBuilder([]);
    const { repo } = makeRepository({ payable: qb });

    await repo.getOverduePayments({
      from: new Date("2026-07-01T00:00:00.000Z"),
      supplierId: "supplier-1",
      purchaseType: "SERVICE",
      paymentStatus: "PARTIAL",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
    });

    const whereClauses = qb.andWhere.mock.calls.map(([sql]: [string]) => sql).join("\n");
    expect(whereClauses).toContain("COALESCE(po.dateIssue, po.createdAt) >= :from");
    expect(whereClauses).toContain("po.supplierId = :supplierId");
    expect(whereClauses).toContain("po.purchaseType = :purchaseType");
    expect(whereClauses).toContain("po.paymentStatus = :paymentStatus");
    expect(whereClauses).not.toContain("pd.paymentMethodId");
    expect(whereClauses).not.toContain("pd.companyPaymentAccountId");
  });

  it("applies every purchase-order dashboard filter to purchase based queries", async () => {
    const qb = makeQueryBuilder([]);
    const { repo } = makeRepository({ purchase: qb });

    await repo.getTopSuppliers({
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-07-31T23:59:59.999Z"),
      supplierId: "supplier-1",
      purchaseType: "SERVICE",
      status: "RECEIVED",
      paymentStatus: "PARTIAL",
      userId: "user-1",
      warehouseId: "warehouse-1",
    });

    const whereClauses = qb.andWhere.mock.calls.map(([sql]: [string]) => sql).join("\n");
    expect(whereClauses).toContain("po.isActive = true");
    expect(whereClauses).toContain("COALESCE(po.dateIssue, po.createdAt) >= :from");
    expect(whereClauses).toContain("COALESCE(po.dateIssue, po.createdAt) <= :to");
    expect(whereClauses).toContain("po.supplierId = :supplierId");
    expect(whereClauses).toContain("po.purchaseType = :purchaseType");
    expect(whereClauses).toContain("po.status = :status");
    expect(whereClauses).toContain("po.paymentStatus = :paymentStatus");
    expect(whereClauses).toContain("po.createdBy = :userId");
    expect(whereClauses).toContain("po.warehouseId = :warehouseId");
  });

  it("applies repeated purchase-order dashboard filters with IN clauses", async () => {
    const qb = makeQueryBuilder([]);
    const { repo } = makeRepository({ purchase: qb });

    await repo.getTopSuppliers({
      supplierIds: ["supplier-1", "supplier-2"],
      purchaseTypes: ["SERVICE", "RAW_MATERIAL"],
      paymentStatuses: ["PARTIAL", "OVERDUE"],
      userIds: ["user-1", "user-2"],
      warehouseIds: ["warehouse-1", "warehouse-2"],
    });

    const whereClauses = qb.andWhere.mock.calls.map(([sql]: [string]) => sql).join("\n");
    expect(whereClauses).toContain("po.supplierId IN (:...supplierIds)");
    expect(whereClauses).toContain("po.purchaseType IN (:...purchaseTypes)");
    expect(whereClauses).toContain("po.paymentStatus IN (:...paymentStatuses)");
    expect(whereClauses).toContain("po.createdBy IN (:...userIds)");
    expect(whereClauses).toContain("po.warehouseId IN (:...warehouseIds)");
  });

  it("does not apply payment document fields to purchase-order based queries", async () => {
    const byStatusQb = makeQueryBuilder([]);
    const topItemsQb = makeQueryBuilder([]);
    const { repo } = makeRepository({ purchase: byStatusQb, item: topItemsQb });

    await repo.getByStatus({
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
    });
    await repo.getTopItems({
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
    });

    const byStatusWhereClauses = byStatusQb.andWhere.mock.calls.map(([sql]: [string]) => sql).join("\n");
    const topItemsWhereClauses = topItemsQb.andWhere.mock.calls.map(([sql]: [string]) => sql).join("\n");
    expect(byStatusWhereClauses).not.toContain("paymentMethodId");
    expect(byStatusWhereClauses).not.toContain("companyPaymentAccountId");
    expect(topItemsWhereClauses).not.toContain("paymentMethodId");
    expect(topItemsWhereClauses).not.toContain("companyPaymentAccountId");
  });

  it("applies approved payment filters through payment documents and joined purchases", async () => {
    const qb = makeQueryBuilder([]);
    const { repo } = makeRepository({ payment: qb });

    await repo.getPaymentMethodUsage({
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-07-31T23:59:59.999Z"),
      supplierId: "supplier-1",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
    });

    const whereClauses = qb.andWhere.mock.calls.map(([sql]: [string]) => sql).join("\n");
    expect(qb.where).toHaveBeenCalledWith("pd.status = :approved", { approved: "APPROVED" });
    expect(whereClauses).toContain("po.supplierId = :supplierId");
    expect(whereClauses).toContain("pd.date >= :from");
    expect(whereClauses).toContain("pd.date <= :to");
    expect(whereClauses).toContain("pd.paymentMethodId = :paymentMethodId");
    expect(whereClauses).toContain("pd.companyPaymentAccountId = :companyPaymentAccountId");
  });

  it("applies repeated payment document filters with IN clauses", async () => {
    const qb = makeQueryBuilder([]);
    const { repo } = makeRepository({ payment: qb });

    await repo.getPaymentMethodUsage({
      paymentMethodIds: ["method-1", "method-2"],
      companyPaymentAccountIds: ["account-1", "account-2"],
    });

    const whereClauses = qb.andWhere.mock.calls.map(([sql]: [string]) => sql).join("\n");
    expect(whereClauses).toContain("pd.paymentMethodId IN (:...paymentMethodIds)");
    expect(whereClauses).toContain("pd.companyPaymentAccountId IN (:...companyPaymentAccountIds)");
  });

  it("resolves top item labels from catalog names before falling back to ids", async () => {
    const qb = makeQueryBuilder([
      { itemId: "stock-item-1", label: "Jabón", itemType: "RAW_MATERIAL", total: "10", quantity: "2" },
    ]);
    const { repo } = makeRepository({ item: qb });

    await repo.getTopItems({});

    expect(qb.leftJoin).toHaveBeenCalledWith("pc_stock_items", "psi", "psi.stock_item_id = item.stock_item_id");
    expect(qb.leftJoin).toHaveBeenCalledWith("pc_skus", "sku", "sku.sku_id = psi.sku_id");
    expect(qb.leftJoin).toHaveBeenCalledWith("pc_products", "product", "product.product_id = sku.product_id");
    expect(qb.select).toHaveBeenCalledWith(
      "COALESCE(item.stock_item_id, item.internal_material_id, item.asset_category_id)::text",
      "itemId",
    );
    expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining("item.stock_item_id::text"), "label");
    expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining("item.internal_material_id::text"), "label");
    expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining("item.asset_category_id::text"), "label");
    expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining("NULLIF(trim(item.service_name), '')"), "label");
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

  it("applies default and clamped limits only to dashboard row lists", async () => {
    const upcomingQb = makeQueryBuilder([]);
    const suppliersQb = makeQueryBuilder([]);
    const byTypeQb = makeQueryBuilder([]);
    const { repo } = makeRepository({
      payable: upcomingQb,
      purchase: suppliersQb,
    });

    await repo.getUpcomingPayments({});
    await repo.getTopSuppliers({ limit: 99 });

    expect(upcomingQb.limit).toHaveBeenCalledWith(10);
    expect(suppliersQb.limit).toHaveBeenCalledWith(50);

    const { repo: aggregateRepo } = makeRepository({ purchase: byTypeQb });
    await aggregateRepo.getByType({ limit: 50 });

    expect(byTypeQb.limit).not.toHaveBeenCalled();
  });
});
