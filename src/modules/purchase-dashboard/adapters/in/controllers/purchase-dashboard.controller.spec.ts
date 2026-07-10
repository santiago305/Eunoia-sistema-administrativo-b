import "reflect-metadata";
import { PATH_METADATA } from "@nestjs/common/constants";
import { PERMISSIONS_KEY } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PurchaseDashboardController } from "./purchase-dashboard.controller";

describe("PurchaseDashboardController", () => {
  const filters = {
    from: "2026-06-01",
    to: "2026-06-30",
    supplierId: "supplier-1",
    purchaseType: "INVENTORY",
    paymentStatus: "PARTIAL",
    userId: "user-1",
    warehouseId: "warehouse-1",
    paymentMethodId: "method-1",
    companyPaymentAccountId: "account-1",
  };

  const makeController = () => {
    const summary = { execute: jest.fn().mockResolvedValue({ totalPurchased: 0 }) };
    const byType = { execute: jest.fn().mockResolvedValue([]) };
    const monthlySpending = { execute: jest.fn().mockResolvedValue([]) };
    const upcomingPayments = { execute: jest.fn().mockResolvedValue([]) };
    const overduePayments = { execute: jest.fn().mockResolvedValue([]) };
    const queryRepo = {
      getByStatus: jest.fn().mockResolvedValue([]),
      getTopItems: jest.fn().mockResolvedValue([]),
      getTopSuppliers: jest.fn().mockResolvedValue([]),
      getPaymentMethodUsage: jest.fn().mockResolvedValue([]),
      getInternalVsInventory: jest.fn().mockResolvedValue([]),
    };
    const listingSearchStorage = {
      listState: jest.fn().mockResolvedValue({ recent: [], metrics: [] }),
      createMetric: jest.fn().mockResolvedValue({
        metricId: "metric-1",
        name: "Filtro dashboard",
        snapshot: {
          filters: [{ field: "supplierId", operator: "in", values: ["supplier-1"] }],
          dateRange: { mode: "absolute", from: "2026-06-01" },
        },
        updatedAt: new Date("2026-06-02T10:00:00.000Z"),
      }),
      deleteMetric: jest.fn().mockResolvedValue(true),
    };

    return {
      controller: new PurchaseDashboardController(
        summary as any,
        byType as any,
        monthlySpending as any,
        upcomingPayments as any,
        overduePayments as any,
        queryRepo as any,
        listingSearchStorage as any,
      ),
      summary,
      byType,
      monthlySpending,
      upcomingPayments,
      overduePayments,
      queryRepo,
      listingSearchStorage,
    };
  };

  it("maps every purchase dashboard endpoint to the new module handlers", async () => {
    const {
      controller,
      summary,
      byType,
      monthlySpending,
      upcomingPayments,
      overduePayments,
      queryRepo,
    } = makeController();

    await controller.getSummary(filters);
    await controller.getByType(filters);
    await controller.getByStatus(filters);
    await controller.getTopItems(filters);
    await controller.getTopSuppliers(filters);
    await controller.getMonthlySpending(filters);
    await controller.getUpcomingPayments(filters);
    await controller.getOverduePayments(filters);
    await controller.getPaymentMethodUsage(filters);
    await controller.getInternalVsInventory(filters);

    expect(summary.execute).toHaveBeenCalledWith(filters);
    expect(byType.execute).toHaveBeenCalledWith(filters);
    expect(queryRepo.getByStatus).toHaveBeenCalledWith(expect.objectContaining({ supplierId: "supplier-1" }));
    expect(queryRepo.getTopItems).toHaveBeenCalledWith(expect.objectContaining({ supplierId: "supplier-1" }));
    expect(queryRepo.getTopSuppliers).toHaveBeenCalledWith(expect.objectContaining({ supplierId: "supplier-1" }));
    expect(monthlySpending.execute).toHaveBeenCalledWith(filters);
    expect(upcomingPayments.execute).toHaveBeenCalledWith(filters);
    expect(overduePayments.execute).toHaveBeenCalledWith(filters);
    expect(queryRepo.getPaymentMethodUsage).toHaveBeenCalledWith(expect.objectContaining({ supplierId: "supplier-1" }));
    expect(queryRepo.getInternalVsInventory).toHaveBeenCalledWith(expect.objectContaining({ supplierId: "supplier-1" }));
  });

  it("keeps base dashboard endpoints behind the default view permission", () => {
    expect(getPermissions("getSummary")).toEqual(["purchases_dashboard.view"]);
    expect(getPermissions("getSearchState")).toEqual(["purchases_dashboard.view"]);
    expect(getPermissions("saveSearchMetric")).toEqual(["purchases_dashboard.view"]);
    expect(getPermissions("deleteSearchMetric")).toEqual(["purchases_dashboard.view"]);
    expect(getPermissions("getByType")).toEqual(["purchases_dashboard.view"]);
    expect(getPermissions("getByStatus")).toEqual(["purchases_dashboard.view"]);
  });

  it("keeps the same public dashboard endpoint paths", () => {
    expect(getPath("getSummary")).toBe("summary");
    expect(getPath("getSearchState")).toBe("search-state");
    expect(getPath("saveSearchMetric")).toBe("search-metrics");
    expect(getPath("deleteSearchMetric")).toBe("search-metrics/:metricId");
    expect(getPath("getByType")).toBe("by-type");
    expect(getPath("getByStatus")).toBe("by-status");
    expect(getPath("getTopItems")).toBe("top-items");
    expect(getPath("getTopSuppliers")).toBe("top-suppliers");
    expect(getPath("getMonthlySpending")).toBe("monthly-spending");
    expect(getPath("getUpcomingPayments")).toBe("upcoming-payments");
    expect(getPath("getOverduePayments")).toBe("overdue-payments");
    expect(getPath("getPaymentMethodUsage")).toBe("payment-method-usage");
    expect(getPath("getInternalVsInventory")).toBe("internal-vs-inventory");
  });

  it("protects extra dashboard groups with their group permissions", () => {
    expect(getPermissions("getMonthlySpending")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_costs",
    ]);
    expect(getPermissions("getUpcomingPayments")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_payments",
    ]);
    expect(getPermissions("getOverduePayments")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_payments",
    ]);
    expect(getPermissions("getPaymentMethodUsage")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_payments",
    ]);
    expect(getPermissions("getTopSuppliers")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_suppliers",
    ]);
    expect(getPermissions("getTopItems")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_items",
    ]);
    expect(getPermissions("getInternalVsInventory")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_operations",
    ]);
  });

  it("loads dashboard saved filters with the purchase-dashboard table key", async () => {
    const { controller, listingSearchStorage } = makeController();
    listingSearchStorage.listState.mockResolvedValueOnce({
      recent: [
        {
          recentId: "recent-1",
          snapshot: {
            q: "ignored",
            filters: [
              { field: "supplierId", operator: "in", values: ["supplier-1", "supplier-1", ""] },
              { field: "status", operator: "in", values: ["RECEIVED"] },
            ],
            dateRange: { mode: "absolute", from: "2026-06-01T12:00:00.000Z" },
          },
          lastUsedAt: new Date("2026-06-02T10:00:00.000Z"),
        },
      ],
      metrics: [
        {
          metricId: "metric-1",
          name: "Dashboard",
          snapshot: {
            filters: [{ field: "paymentStatus", operator: "in", values: ["PARTIAL"] }],
            dateRange: { mode: "absolute", to: "2026-06-30" },
          },
          updatedAt: new Date("2026-06-03T10:00:00.000Z"),
        },
      ],
    });

    const state = await controller.getSearchState({ id: "user-1" });

    expect(listingSearchStorage.listState).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "purchase-dashboard",
    });
    expect(listingSearchStorage.listState).not.toHaveBeenCalledWith(
      expect.objectContaining({ tableKey: "purchase-orders" }),
    );
    expect(state).toEqual({
      recent: [
        {
          recentId: "recent-1",
          snapshot: {
            filters: [{ field: "supplierId", operator: "in", values: ["supplier-1"] }],
            dateRange: { mode: "absolute", from: "2026-06-01" },
          },
          lastUsedAt: new Date("2026-06-02T10:00:00.000Z"),
        },
      ],
      saved: [
        {
          metricId: "metric-1",
          name: "Dashboard",
          snapshot: {
            filters: [{ field: "paymentStatus", operator: "in", values: ["PARTIAL"] }],
            dateRange: { mode: "absolute", to: "2026-06-30" },
          },
          updatedAt: new Date("2026-06-03T10:00:00.000Z"),
        },
      ],
    });
  });

  it("saves dashboard metrics with sanitized filters and date range", async () => {
    const { controller, listingSearchStorage } = makeController();

    const response = await controller.saveSearchMetric(
      {
        name: "  Filtro dashboard  ",
        snapshot: {
          filters: [
            { field: "supplierId", operator: "in", values: ["supplier-1", "supplier-1", ""] },
            { field: "invalid" as any, operator: "in", values: ["x"] },
            { field: "paymentStatus", operator: "eq" as any, values: ["PAID"] },
          ],
          dateRange: { mode: "absolute", from: "2026-06-01T12:00:00.000Z", to: "bad-date" },
        },
      },
      { id: "user-1" },
    );

    expect(listingSearchStorage.createMetric).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "purchase-dashboard",
      name: "Filtro dashboard",
      snapshot: {
        filters: [{ field: "supplierId", operator: "in", values: ["supplier-1"] }],
        dateRange: { mode: "absolute", from: "2026-06-01" },
      },
    });
    expect(response).toEqual({
      type: "success",
      message: "Metrica guardada correctamente",
      metric: expect.objectContaining({
        metricId: "metric-1",
        snapshot: {
          filters: [{ field: "supplierId", operator: "in", values: ["supplier-1"] }],
          dateRange: { mode: "absolute", from: "2026-06-01" },
        },
      }),
    });
  });

  it("does not save an empty dashboard metric", async () => {
    const { controller, listingSearchStorage } = makeController();

    const response = await controller.saveSearchMetric(
      {
        name: "Sin filtros",
        snapshot: {
          filters: [{ field: "supplierId", operator: "in", values: [""] }],
          dateRange: { mode: "absolute" },
        },
      },
      { id: "user-1" },
    );

    expect(response).toEqual({
      type: "error",
      message: "No hay filtros para guardar en la metrica",
    });
    expect(listingSearchStorage.createMetric).not.toHaveBeenCalled();
  });

  it("deletes dashboard metrics with the purchase-dashboard table key", async () => {
    const { controller, listingSearchStorage } = makeController();
    const metricId = "11111111-1111-4111-8111-111111111111";

    const response = await controller.deleteSearchMetric(metricId, { id: "user-1" });

    expect(listingSearchStorage.deleteMetric).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "purchase-dashboard",
      metricId,
    });
    expect(response).toEqual({
      type: "success",
      message: "Metrica eliminada correctamente",
    });
  });
});

function getPermissions(methodName: keyof PurchaseDashboardController) {
  return Reflect.getMetadata(PERMISSIONS_KEY, PurchaseDashboardController.prototype[methodName]);
}

function getPath(methodName: keyof PurchaseDashboardController) {
  return Reflect.getMetadata(PATH_METADATA, PurchaseDashboardController.prototype[methodName]);
}
