import { PERMISSIONS_SEED } from "./permissions-seed";
import { DEPRECATED_PERMISSION_CODES } from "../../infrastructure/seed/access-control.seeder";

describe("permissions seed", () => {
  it("includes page.payments.view", () => {
    const hasPagePayments = PERMISSIONS_SEED.some((item) => item.code === "page.payments.view");
    expect(hasPagePayments).toBe(true);
  });

  it("includes payments.read and payments.manage", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));
    expect(codes.has("payments.read")).toBe(true);
    expect(codes.has("payments.manage")).toBe(true);
  });

  it("includes the final purchase module permission matrix", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));
    const expectedCodes = [
      "purchases.view",
      "purchases.view_all",
      "purchases.view_detail",
      "purchases.create",
      "purchases.edit_draft",
      "purchases.submit",
      "purchases.approve",
      "purchases.reject",
      "purchases.cancel",
      "purchases.receive",
      "purchases.receive_stock",
      "purchases.manage_internal_material",
      "purchases.manage_assets",
      "purchases.manage_services",
      "purchases.export",
      "purchases.view_costs",
      "purchases.attach_documents",
      "purchases.delete_documents",
      "purchases.view_history",
      "payments.read",
      "payments.create",
      "payments.schedule",
      "payments.approve",
      "payments.reject",
      "payments.delete",
      "payments.attach_evidence",
      "payments.view_evidence",
      "payments.view_all",
      "payments.view_own",
      "payments.export",
      "accounts-payable.view",
      "accounts-payable.manage",
      "payment_accounts.view",
      "payment_accounts.create",
      "payment_accounts.edit",
      "payment_accounts.disable",
      "payment_accounts.delete",
      "payment_accounts.view_sensitive",
      "recurring_purchases.view",
      "recurring_purchases.create",
      "recurring_purchases.edit",
      "recurring_purchases.pause",
      "recurring_purchases.cancel",
      "recurring_purchases.pay",
      "purchases_dashboard.view",
      "purchases_dashboard.view_costs",
      "purchases_dashboard.export",
    ];

    expectedCodes.forEach((code) => expect(codes.has(code)).toBe(true));
  });

  it("includes purchase attachment permissions", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));

    expect(codes.has("purchases.attachments.view")).toBe(true);
    expect(codes.has("purchases.attachments.upload")).toBe(true);
    expect(codes.has("purchases.attachments.delete")).toBe(true);
  });

  it("includes fine warehouse and supplier permissions", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));

    expect(codes.has("warehouses.create")).toBe(true);
    expect(codes.has("warehouses.update")).toBe(true);
    expect(codes.has("warehouses.delete")).toBe(true);
    expect(codes.has("warehouses.locations.manage")).toBe(true);
    expect(codes.has("suppliers.create")).toBe(true);
    expect(codes.has("suppliers.update")).toBe(true);
    expect(codes.has("suppliers.delete")).toBe(true);
    expect(codes.has("suppliers.payment_methods.manage")).toBe(true);
  });

  it("defines suppliers page permission with supplier permissions", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));
    const pageSuppliers = PERMISSIONS_SEED.find((item) => item.code === "page.suppliers.view");

    expect(codes.has("page.providers.view")).toBe(false);
    expect(pageSuppliers).toEqual(
      expect.objectContaining({
        code: "page.suppliers.view",
        module: "suppliers",
        resource: "suppliers",
      }),
    );
  });

  it("deprecates old providers page permission code", () => {
    expect(DEPRECATED_PERMISSION_CODES).toContain("page.providers.view");
  });

  it("does not define duplicated permission codes", () => {
    const codes = PERMISSIONS_SEED.map((item) => item.code);
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("includes fine catalog and inventory permissions", () => {
    const codes = new Set(PERMISSIONS_SEED.map((item) => item.code));

    expect(codes.has("page.products.view")).toBe(true);
    expect(codes.has("page.materials.view")).toBe(true);
    expect(codes.has("products.create")).toBe(true);
    expect(codes.has("materials.create")).toBe(true);
    expect(codes.has("products.skus.create")).toBe(false);
    expect(codes.has("products.skus.update")).toBe(false);
    expect(codes.has("materials.skus.create")).toBe(false);
    expect(codes.has("materials.skus.update")).toBe(false);
    expect(codes.has("transfers.products.process")).toBe(true);
    expect(codes.has("adjustments.materials.process")).toBe(true);
    expect(codes.has("inventory-alerts.receive_mail")).toBe(true);
  });

  it("does not export predefined role permission assignments", () => {
    expect(PERMISSIONS_SEED.some((item) => item.code === "*")).toBe(false);
  });
});

