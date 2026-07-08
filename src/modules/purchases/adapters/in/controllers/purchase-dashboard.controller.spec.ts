import "reflect-metadata";
import { PERMISSIONS_KEY } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PURCHASE_DASHBOARD, PurchaseDashboardReader } from "src/modules/purchases/application/services/purchase-dashboard.service";
import { PurchaseDashboardController } from "./purchase-dashboard.controller";

describe("PurchaseDashboardController", () => {
  let reader: jest.Mocked<PurchaseDashboardReader>;
  let controller: PurchaseDashboardController;

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

  beforeEach(() => {
    reader = {
      summary: jest.fn().mockResolvedValue({ totalPurchased: 0 }),
      byType: jest.fn().mockResolvedValue([]),
      byStatus: jest.fn().mockResolvedValue([]),
      topItems: jest.fn().mockResolvedValue([]),
      topSuppliers: jest.fn().mockResolvedValue([]),
      monthlySpending: jest.fn().mockResolvedValue([]),
      upcomingPayments: jest.fn().mockResolvedValue([]),
      overduePayments: jest.fn().mockResolvedValue([]),
      paymentMethodUsage: jest.fn().mockResolvedValue([]),
      internalVsInventory: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PurchaseDashboardReader>;
    controller = new PurchaseDashboardController(reader);
  });

  it("maps every purchase dashboard endpoint to the reader with the same filters", async () => {
    await controller.summary(filters);
    await controller.byType(filters);
    await controller.byStatus(filters);
    await controller.topItems(filters);
    await controller.topSuppliers(filters);
    await controller.monthlySpending(filters);
    await controller.upcomingPayments(filters);
    await controller.overduePayments(filters);
    await controller.paymentMethodUsage(filters);
    await controller.internalVsInventory(filters);

    expect(reader.summary).toHaveBeenCalledWith(filters);
    expect(reader.byType).toHaveBeenCalledWith(filters);
    expect(reader.byStatus).toHaveBeenCalledWith(filters);
    expect(reader.topItems).toHaveBeenCalledWith(filters);
    expect(reader.topSuppliers).toHaveBeenCalledWith(filters);
    expect(reader.monthlySpending).toHaveBeenCalledWith(filters);
    expect(reader.upcomingPayments).toHaveBeenCalledWith(filters);
    expect(reader.overduePayments).toHaveBeenCalledWith(filters);
    expect(reader.paymentMethodUsage).toHaveBeenCalledWith(filters);
    expect(reader.internalVsInventory).toHaveBeenCalledWith(filters);
  });

  it("keeps the dashboard reader behind an injection token", () => {
    expect(PURCHASE_DASHBOARD).toBe("PURCHASE_DASHBOARD");
  });

  it("keeps base dashboard endpoints behind the default view permission", () => {
    expect(getPermissions("summary")).toEqual(["purchases_dashboard.view"]);
    expect(getPermissions("byType")).toEqual(["purchases_dashboard.view"]);
    expect(getPermissions("byStatus")).toEqual(["purchases_dashboard.view"]);
  });

  it("protects extra dashboard groups with their group permissions", () => {
    expect(getPermissions("monthlySpending")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_costs",
    ]);
    expect(getPermissions("upcomingPayments")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_payments",
    ]);
    expect(getPermissions("overduePayments")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_payments",
    ]);
    expect(getPermissions("paymentMethodUsage")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_payments",
    ]);
    expect(getPermissions("topSuppliers")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_suppliers",
    ]);
    expect(getPermissions("topItems")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_items",
    ]);
    expect(getPermissions("internalVsInventory")).toEqual([
      "purchases_dashboard.view",
      "purchases_dashboard.view_operations",
    ]);
  });
});

function getPermissions(methodName: keyof PurchaseDashboardController) {
  return Reflect.getMetadata(PERMISSIONS_KEY, PurchaseDashboardController.prototype[methodName]);
}
